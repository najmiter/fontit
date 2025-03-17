import * as vscode from 'vscode';
import { getFonts } from 'font-list';

const fontDescriptions: { [key: string]: string } = {
  'Fira Code': 'A monospace font with programming ligatures',
  'JetBrains Mono': 'A typeface for developers',
  'Source Code Pro':
    'A monospaced font for user interfaces and coding environments',
  'Cascadia Code': 'A fun, new monospaced font from Microsoft',
  Hack: 'A typeface designed for source code',
  Menlo: 'A monospaced font by Apple',
  Monaco: 'A monospaced font by Apple',
  Consolas: 'A monospaced font designed for Microsoft',
  'Ubuntu Mono': 'A monospace font from the Ubuntu font family',
  'Droid Sans Mono': 'A monospace font by Google Android',
  'Roboto Mono': 'A monospaced version of Roboto',
};

const fontDownloadUrls: { [key: string]: string } = {
  'Fira Code':
    'https://github.com/tonsky/FiraCode/releases/download/6.2/Fira_Code_v6.2.zip',
  'JetBrains Mono':
    'https://download.jetbrains.com/fonts/JetBrainsMono-2.304.zip',
  'Source Code Pro':
    'https://github.com/adobe-fonts/source-code-pro/releases/download/2.038R-ro%2F1.058R-it%2F1.018R-VAR/OTF-source-code-pro-2.038R-ro-1.058R-it.zip',
  'Cascadia Code':
    'https://github.com/microsoft/cascadia-code/releases/download/v2111.01/CascadiaCode-2111.01.zip',
  'Ubuntu Mono':
    'https://assets.ubuntu.com/v1/fad7939b-ubuntu-font-family-0.83.zip',
  'Droid Sans Mono':
    'https://github.com/sixrevisions/free-programming-fonts/blob/master/fonts/web/droid-sans-mono.ttf',
  'Roboto Mono': 'https://fonts.google.com/download?family=Roboto%20Mono',
  Menlo:
    'https://github.com/hbin/top-programming-fonts/raw/refs/heads/master/Menlo-Regular.ttf',
  Monaco:
    'https://github.com/hbin/top-programming-fonts/raw/refs/heads/master/Monaco-Linux.ttf',
  Hack: 'https://github.com/source-foundry/Hack/releases/download/v3.003/Hack-v3.003-ttf.zip',
  Consolas:
    'https://github.com/pensnarik/consolas-font/raw/refs/heads/master/Consolas-Regular.ttf',
};

const fontVariations: { [key: string]: string[] } = {
  'Cascadia Code': [
    'Cascadia Code',
    'CascadiaCode',
    'Cascadia Mono',
    'CascadiaMono',
  ],
  'JetBrains Mono': ['JetBrains Mono', 'JetBrainsMono'],
  'Source Code Pro': ['Source Code Pro', 'SourceCodePro'],
  'Ubuntu Mono': ['Ubuntu Mono', 'UbuntuMono'],
  'Droid Sans Mono': ['Droid Sans Mono', 'DroidSansMono'],
  'Roboto Mono': ['Roboto Mono', 'RobotoMono'],
  'Fira Code': ['Fira Code', 'FiraCode'],
};

let disposables: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'fontit.changeFont',
    async () => {
      try {
        const systemFonts = await getFonts();
        const systemFontsLower = systemFonts.map((font) =>
          font.toLowerCase().trim()
        );

        const isFontInstalled = (fontName: string): boolean => {
          const variations = fontVariations[fontName] || [fontName];
          return variations.some((variant) =>
            systemFontsLower.some((sysFont) =>
              sysFont.includes(variant.toLowerCase().trim())
            )
          );
        };

        const availableFonts: vscode.QuickPickItem[] = [];
        const missingFonts: vscode.QuickPickItem[] = [];

        Object.keys(fontDescriptions).forEach((font) => {
          const quickPickItem = {
            label: font,
            description: fontDescriptions[font],
            detail: isFontInstalled(font)
              ? 'Installed'
              : '$(cloud-download) Click to install',
          };

          if (isFontInstalled(font)) {
            availableFonts.push(quickPickItem);
          } else {
            missingFonts.push(quickPickItem);
          }
        });

        const allFonts = [...availableFonts, ...missingFonts];

        const selectedFont = await vscode.window.showQuickPick(allFonts, {
          placeHolder: 'Select a font (installed fonts shown first)',
          matchOnDescription: true,
        });

        if (selectedFont) {
          if (!isFontInstalled(selectedFont.label)) {
            const installChoice = await vscode.window.showInformationMessage(
              `${selectedFont.label} is not installed. Would you like to download it?`,
              'Download',
              'Cancel'
            );

            if (installChoice === 'Download') {
              const downloadUrl = fontDownloadUrls[selectedFont.label];
              if (downloadUrl) {
                await vscode.env.openExternal(vscode.Uri.parse(downloadUrl));
                vscode.window.showInformationMessage(
                  `Please install the font from the downloaded file and restart VS Code to use it.`
                );
              } else {
                vscode.window.showErrorMessage(
                  `Download URL not available for ${selectedFont.label}`
                );
              }
              return;
            }
          } else {
            await vscode.workspace
              .getConfiguration()
              .update(
                'editor.fontFamily',
                selectedFont.label,
                vscode.ConfigurationTarget.Global
              );
            vscode.window.showInformationMessage(
              `Font changed to ${selectedFont.label}`
            );
          }
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          'Error loading system fonts: ' + error.message
        );
      }
    }
  );

  disposables.push(disposable);
  context.subscriptions.push(disposable);
}

export function deactivate() {
  if (disposables) {
    disposables.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (e) {
        console.error(e);
      }
    });
    disposables = [];
  }
}
