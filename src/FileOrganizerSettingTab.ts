import { PluginSettingTab, App, Setting } from "obsidian";
import { logMessage, cleanPath } from "../utils";
import FileOrganizer from "./index";

export class FileOrganizerSettingTab extends PluginSettingTab {
  plugin: FileOrganizer;

  constructor(app: App, plugin: FileOrganizer) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    const apiKeySetting = new Setting(containerEl)
      .setName("File Organizer API Key")
      .setDesc(
        "Enter your API Key here. Get it at https://app.fileorganizer2000.com/ "
      )
      .addText((text) =>
        text
          .setPlaceholder("Enter your API Key")
          .setValue(this.plugin.settings.API_KEY)
          .onChange(async (value) => {
            this.plugin.settings.API_KEY = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Inbox folder")
      .setDesc("Choose which folder to automatically organize files from")
      .addText((text) =>
        text
          .setPlaceholder("Enter your path")
          .setValue(this.plugin.settings.pathToWatch)
          .onChange(async (value) => {
            this.plugin.settings.pathToWatch = cleanPath(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Use Self-hosted")
      .setDesc("Toggle to use a custom server instead of the default.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useCustomServer)
          .onChange(async (value) => {
            this.plugin.settings.useCustomServer = value;
            await this.plugin.saveSettings();
            if (!value) {
              apiKeySetting.settingEl.show();
              customServerSetting.settingEl.hide();
              return;
            }
            apiKeySetting.settingEl.hide();
            customServerSetting.settingEl.show();
          })
      );

    const customServerSetting = new Setting(containerEl)
      .setName("Self-hosted URL")
      .setDesc("Enter the address of your custom server.")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:3000")
          .setValue(this.plugin.settings.customServerUrl)
          .onChange(async (value) => {
            this.plugin.settings.customServerUrl = value;
            await this.plugin.saveSettings();
          })
      );

    if (!this.plugin.settings.useCustomServer) {
      customServerSetting.settingEl.hide();
    }

    new Setting(containerEl).setName("Features").setHeading();

    new Setting(containerEl)
      .setName("FileOrganizer logs")
      .setDesc(
        "Allows you to keep track of the changes made by file Organizer."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useLogs)
          .onChange(async (value) => {
            this.plugin.settings.useLogs = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Similar tags")
      .setDesc("Append similar tags to the processed file.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useSimilarTags)
          .onChange(async (value) => {
            this.plugin.settings.useSimilarTags = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Folder config").setHeading();
    new Setting(containerEl)
      .setName("Attachments folder")
      .setDesc(
        "Enter the path to the folder where the original images and audio will be moved."
      )
      .addText((text) =>
        text
          .setPlaceholder("Enter your path")
          .setValue(this.plugin.settings.attachmentsPath)
          .onChange(async (value) => {
            // cleanup path remove leading and trailing slashes
            this.plugin.settings.attachmentsPath = cleanPath(value);
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("File Organizer log folder")
      .setDesc("Choose a folder for Organization Logs e.g. Ava/Logs.")
      .addText((text) =>
        text
          .setPlaceholder("Enter your path")
          .setValue(this.plugin.settings.logFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.logFolderPath = cleanPath(value);
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("Output folder path")
      .setDesc(
        "Enter the path where you want to save the processed files. e.g. Processed/myfavoritefolder"
      )
      .addText((text) =>
        text
          .setPlaceholder("Enter your path")
          .setValue(this.plugin.settings.defaultDestinationPath)
          .onChange(async (value) => {
            const cleanedPath = cleanPath(value);
            logMessage(cleanedPath);
            this.plugin.settings.defaultDestinationPath = cleanedPath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Experimental features").setHeading();
    new Setting(containerEl)
      .setName("Custom vision prompt")
      .setDesc("Enter your custom prompt for vision processing here")
      .addText((text) =>
        text
          .setPlaceholder("Enter your custom prompt")
          .setValue(this.plugin.settings.customVisionPrompt)
          .onChange(async (value) => {
            this.plugin.settings.customVisionPrompt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Experimental: Describe workfow (contact for access)")
      .setDesc(
        "Use words to explain how File Organizer uses GPT-4 to organize your files."
      )
      .setDisabled(true);
    new Setting(containerEl)
      .setName("Experimental: Append to Existing file (contact for access)")
      .setDesc(
        "Let file Organizer find the most similar file and append the content to it."
      )
      .setDisabled(true);
    new Setting(containerEl)
      .setName("Experimental: Full Auto Org (contact for access)")
      .setDesc("Let file Organizer work fully automatically.")
      .setDisabled(true);
  }
}