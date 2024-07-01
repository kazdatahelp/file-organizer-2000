import {
  GenerateObjectResult,
  LanguageModel,
  generateObject,
  generateText,
  streamObject,
} from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import fs from "fs";
import { promises as fsPromises } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import OpenAI from "openai";
// Function to generate tags
export async function generateTags(
  content: string,
  fileName: string,
  tags: string[],
  model: LanguageModel
) {
  const modelName = model.modelId;

  const response = await generateObject({
    model,
    schema: z.object({
      tags: z.array(z.string()).default(["none"]),
    }),
    prompt: `Given the text "${content}" (and if relevant ${fileName}), identify the at most 3 relevant tags from the following list, sorted from most commonly found to least commonly found: ${tags.join(
      ", "
    )}`,
  });

  return response;
}

// Function to generate alias variations
export async function generateAliasVariations(
  fileName: string,
  content: string,
  model: LanguageModel
) {
  const response = await generateObject({
    model,
    schema: z.object({
      aliases: z.array(z.string()).default([]),
    }),
    prompt: `Generate a list of 3 closely related names (aliases) for the given document name: "${fileName}". The aliases should include variations in capitalization.  Consider the context provided by the content "${content}".`,
    system:
      "only answer with good names that could refer to a title of this document",
  });

  return response;
}

// Function to guess the relevant folder
export async function guessRelevantFolder(
  content: string,
  fileName: string,
  folders: string[],
  model: LanguageModel
) {
  // eslint-disable-next-line no-case-declarations
  const response = await generateObject({
    model,
    schema: z.object({
      suggestedFolder: z.string().nullable(),
    }),
    prompt: `Review the content: "${content}" and the file name: "${fileName}". Decide which of the following folders is the most suitable: ${folders.join(
      ", "
    )}. Base your decision on the relevance of the content and the file name to the folder themes. If no existing folder is suitable, respond with null.`,
  });
  console.log(
    `${
      response.object.suggestedFolder
        ? "Suggested folder: " + response.object.suggestedFolder
        : "No suggested folder"
    }`
  );

  return response;
}

// Function to create a new folder if none is found
export async function createNewFolder(
  content: string,
  fileName: string,
  existingFolders: string[],
  model: LanguageModel
) {
  const response = await generateObject({
    model,
    schema: z.object({
      newFolderName: z.string(),
    }),
    prompt: `Given the content: "${content}" and the file name: "${fileName}", suggest a new folder name that would appropriately categorize this file. Consider the existing folder structure: ${existingFolders.join(
      ", "
    )}.`,
  });
  console.log("Suggesting a new folder: ", response.object.newFolderName);

  return response;
}

// Function to generate relationships between files
export async function generateRelationships(
  activeFileContent: string,
  files: { name: string }[],
  model: LanguageModel
) {
  const modelName = model.modelId;

  const response = await generateObject({
    model,
    schema: z.object({
      similarFiles: z.array(z.string()),
    }),
    prompt: `Analyze the content of the active file and compare it with the following files:

          Active File Content:
          ${activeFileContent}

          List of Files:
          ${files.map((file: { name: string }) => `${file.name}`).join(", ")}
          
          Determine which five files are most similar to the active file based on their content. Provide a ranked list of the top 5 similar file names, each on a new line. If no files are similar, return null.`,
  });

  return response;
}

// Function to generate document titles
export async function generateDocumentTitle(
  document: string,
  currentName: string,
  model: LanguageModel,
  renameInstructions: string
) {
  console.log("renameInstructions", renameInstructions);
  // console log the prompt and system
  const prompt = `You are an AI specialized in generating concise and relevant document titles. Ensure the title is under 50 characters, contains no special characters, and is highly specific to the document's content.
      Additional context:
      Time: ${new Date().toISOString()}
      Current Name: ${currentName}
      Document Content: ${document}
      Provide a suitable title
      ${renameInstructions}
      `;
  const system = `Only answer with human readable title`;

  console.log("prompt", prompt);
  console.log("system", system);
  const response = await generateObject({
    model,
    schema: z.object({
      name: z.string().max(60),
    }),
    system,
    prompt,
  });

  return response;
}

// Function to extract text from image
export async function extractTextFromImage(
  image: ArrayBuffer,
  model: LanguageModel
): Promise<string> {
  const modelName = model.modelId;

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract text from image. Write in markdown. If there's a drawing, describe it. Respond with only the extracted text or description, no other text.",
        },
        {
          type: "image",
          image: image,
        },
      ],
    },
  ];

  switch (modelName) {
    case "gpt-4o": {
      const response = await generateText({
        model,
        //@ts-ignore
        messages,
      });

      return response.text.trim();
    }
    default: {
      const defaultResponse = await generateText({
        model,
        //@ts-ignore
        messages,
      });

      return defaultResponse.text.trim();
    }
  }
}

// Function to classify document type
export async function classifyDocument(
  content: string,
  fileName: string,
  templateNames: string[],
  model: LanguageModel
) {
  console.log("content", content);
  console.log("fileName", fileName);
  console.log("templateNames", templateNames);

  const response = await generateObject({
    model,
    schema: z.object({
      documentType: z.string().optional(),
    }),
    system:
      "Only answer with the name of the document type if it matches one of the template types. Otherwise, answer with an empty string.",
    prompt: `Given the text content:

          "${content}"
          
          and if relevant, the file name:
          
          "${fileName}"
          
          Please identify which of the following document types best matches the content:
          
          Template Types:
          ${templateNames.join(", ")}
          
          If the content clearly matches one of the provided template types, respond with the name of that document type. If the content does not clearly match any of the template types, respond with an empty string.`,
  });

  return response;
}

// Function to format document content
export async function formatDocumentContent(
  content: string,
  formattingInstruction: string,
  model: LanguageModel
) {
  const response = await generateObject({
    model,
    schema: z.object({
      formattedContent: z.string(),
    }),
    system: "Answer in markdown",
    prompt: `Format the following content according to the given instruction:
        
        Content:
        "${content}"
        
        Formatting Instruction:
        "${formattingInstruction}"`,
  });

  return response;
}

export async function identifyConceptsAndFetchChunks(
  content: string,
  model: LanguageModel
) {
  const response = await generateObject({
    model,
    schema: z.object({
      concepts: z.array(
        z.object({
          name: z.string(),
          chunk: z.string(),
        })
      ),
    }),
    prompt: `Analyze the following content:

    ${content}

    1. Identify the key concepts in the document.
    2. For each concept, extract the most relevant chunk of information.
    3. Return a list of concepts, each with its name and associated chunk of information.
    
    Aim to split the document into the fewest atomic chunks possible while capturing all key concepts.`,
  });

  return response;
}

// Function to identify concepts in the document
export async function identifyConcepts(content: string, model: LanguageModel) {
  const response = await generateObject({
    model,
    schema: z.object({
      concepts: z.array(z.string()),
    }),
    prompt: `Split documents into the fewest atomic chunks possible. The goal is to identify the key concepts in the document.

      ${content}

      `,
  });

  return response;
}

// Function to fetch chunks for a given concept
export async function fetchChunksForConcept(
  content: string,
  concept: string,
  model: LanguageModel
) {
  const response = await generateObject({
    model,
    schema: z.object({
      content: z.string(),
    }),
    prompt: `Given the document content and the concept "${concept}", extract the relevant chunks of information:

    Document Content:
    ${content}

    Concept: ${concept}

    `,
  });

  return response;
}

// Function to generate transcript from audio
export async function generateTranscriptFromAudio(
  audioBuffer: ArrayBuffer,
  fileExtension: string,
  openaiApiKey: string
): Promise<string> {
  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true,
  });
  console.log("audioBuffer", audioBuffer);

  // Save the audio buffer to a temporary file
  const tempFilePath = join(tmpdir(), `audio_${Date.now()}.${fileExtension}`);
  await fsPromises.writeFile(tempFilePath, Buffer.from(audioBuffer));

  // Create a readable stream from the temporary file
  const audioStream = fs.createReadStream(tempFilePath);

  try {
    console.log("fileExtension", fileExtension);
    // Use the OpenAI API to generate the transcript
    const response = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
    });
    console.log("response", response);

    return response.text;
  } catch (error) {
    console.error("Error generating transcript:", error);
    throw error;
  } finally {
    // Clean up the temporary file
    await fsPromises.unlink(tempFilePath);
  }
}
