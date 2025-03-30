import * as vscode from 'vscode';
import { getFonts } from 'font-list';

import {
  fontVariations,
  fontDescriptions,
  fontDownloadUrls,
} from './constants';

let disposables: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'fontit.changeFont',
    async () => {
      try {
        let systemFontsLower: string[] = [];

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Loading fonts...',
            cancellable: false,
          },
          async () => {
            const systemFonts = await getFonts();
            systemFontsLower = systemFonts
              .map((font) => font.replace(/"/g, ''))
              .sort((x) =>
                Object.keys(fontDescriptions).some((s) => s.includes(x))
                  ? -1
                  : 1
              );
          }
        );

        const isFontInstalled = (fontName: string): boolean => {
          const variations = fontVariations[fontName] || [fontName];
          return variations.some((variant) =>
            systemFontsLower.some((sysFont) =>
              sysFont.match(new RegExp(variant, 'i'))
            )
          );
        };

        const availableFonts: vscode.QuickPickItem[] = [];
        const missingFonts: vscode.QuickPickItem[] = [];

        systemFontsLower.forEach((font) => {
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
            const formattedFontName = formatFontNameForSettings(
              selectedFont.label
            );

            await vscode.workspace
              .getConfiguration()
              .update(
                'editor.fontFamily',
                formattedFontName,
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

function formatFontNameForSettings(fontName: string): string {
  if (fontName.includes(' ')) {
    return `'${fontName}'`;
  }
  return fontName;
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
