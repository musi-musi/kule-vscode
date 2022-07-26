import { workspace, ExtensionContext, window } from "vscode";

import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
  TransportKind,
} from "vscode-languageclient/node";
import axios from "axios";
import { chmodSync, existsSync, writeFileSync } from "fs";
import * as mkdirp from "mkdirp";
import * as net from "net";
import { Server } from "http";
import { rejects } from "assert";
import { create } from "domain";

let outputChannel: vscode.OutputChannel;
let client: LanguageClient;
let clientWasCreated: boolean = false;

export function activate(context: ExtensionContext) {
  outputChannel = window.createOutputChannel("kule");

  vscode.commands.registerCommand("kule.startServer", async () => {
    await startClient().catch(() => {});
  });

  vscode.commands.registerCommand("kule.stopServer", async () => {
    await stopClient().catch(() => {});
  });
  
  vscode.commands.registerCommand("kule.restartServer", async () => {
    await restartClient().catch(() => {});
  });

}

function config() {
  return workspace.getConfiguration("kule");
}

function clientIsRunning(): boolean {
  return clientWasCreated && client.isRunning();
}

function logAndAnnounceError(err: Error, message: string) {
  if (err) {
    outputChannel.appendLine("[" + err.name + "] " + err.message);
    window.showErrorMessage(message, "Show Details").then(option => {
      if (option) {
        outputChannel.show(true);
      }
    });
  }
  else {
    window.showErrorMessage(message);
  }
}


function startClient(): Promise<void> {
  if (clientIsRunning()) {
    window.showErrorMessage("Already started kule language server, stop it before starting it again");
    return Promise.resolve();
  }
  else {
    if (clientWasCreated) {
      client.dispose();
    }
    client = new LanguageClient(
      "kule",
      "kule Language Server",
      {
        command: config().get("serverPath", "kule-server"),
      },
      {
        documentSelector: [{ scheme: "file", language: "kule" }],
        outputChannel,
      }
    );
    clientWasCreated = true;
    return client.start().then(() => {
      window.showInformationMessage("Started kule language server");
    },
    (err) => {
      window.showErrorMessage("Couldn't start kule language server");
      return Promise.reject(err);
    });
  }
}

function restartClient(): Promise<void> {
  if (clientIsRunning()) {
    return stopClient().then(() => {
      return startClient();
    },
    (err) => {
      logAndAnnounceError(err, "Couldn't restart kule language server");
      return Promise.reject(err);
    })
  }
  else {
    window.showErrorMessage("No running kule language server to restart");
    return Promise.reject();
  }
}

function stopClient(): Promise<void> {
  if (clientIsRunning()) {
    return client.stop().then(() => {
      window.showInformationMessage("Stopped language server");
    }, (err) => {
      logAndAnnounceError(err, "Couldn't stop kule language server");
      return Promise.reject(err);
    });
  }
  else {
      window.showErrorMessage("No running kule language server to stop");
      return Promise.resolve();
  }
}

export function deactivate(): Thenable<void> {
  return stopClient();
}
