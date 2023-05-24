import { Client } from 'discord-rpc'; // eslint-disable-line

import { commands, ExtensionContext, window, workspace } from 'vscode';

import throttle from 'lodash-es/throttle';

import { activity } from './activity';

import { CLIENT_ID, CONFIG_KEYS } from './constants';

import { log, LogLevel } from './logger';

import { getConfig } from './util';

const config = getConfig();

let state = {};

let idle: NodeJS.Timeout | undefined;

let listeners: { dispose(): unknown }[] = [];

let rpc = new Client({ transport: 'ipc' });

export function cleanUp() {
  listeners.forEach((listener) => listener.dispose());
  listeners = [];
}

async function sendActivity() {
  await rpc.setActivity(state = await activity(state));
}

async function login() {
  log(LogLevel.Info, 'Creating discord-rpc client');

  rpc = new Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    log(LogLevel.Info, 'Successfully connected to Discord');

    sendActivity();

    const onChangeActiveTextEditor = window.onDidChangeActiveTextEditor(() => sendActivity());
    const onChangeTextDocument = workspace.onDidChangeTextDocument(throttle(() => sendActivity(), 2000));

    listeners.push(onChangeActiveTextEditor, onChangeTextDocument);
  });

  rpc.on('disconnected', async () => {
    cleanUp();

    await rpc.destroy();
  });

  try {
    await rpc.login({ clientId: CLIENT_ID });
  }
  catch (error) {
    log(LogLevel.Error, `Encountered following error while trying to login:\n${error as string}`);

    cleanUp();

    await rpc.destroy();

    if (!config[CONFIG_KEYS.SuppressNotifications]) {
      if (error?.message?.includes('ENOENT')) {
        window.showErrorMessage('No Discord client detected');
      }
      else {
        window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error as string}`);
      }
    }
  }
}

export async function activate(context: ExtensionContext) {
  log(LogLevel.Info, 'Discord Presence activated');

  let isWorkspaceExcluded = false;

  const enable = async (update = true) => {
    if (update) {
      try {
        await config.update('enabled', true);
      }
      catch
      {
        //
      }
    }

    log(LogLevel.Info, 'Enable: Cleaning up old listeners');

    cleanUp();

    log(LogLevel.Info, 'Enable: Attempting to recreate login');

    login();
  };

  const disable = async (update = true) => {
    if (update) {
      try {
        await config.update('enabled', false);
      }
      catch
      {
        //
      }
    }

    log(LogLevel.Info, 'Disable: Cleaning up old listeners');

    cleanUp();

    rpc?.destroy();

    log(LogLevel.Info, 'Disable: Destroyed the rpc instance');
  };

  const enabler = commands.registerCommand('discord.enable', async () => {
    await disable();
    await enable();
    await window.showInformationMessage('Enabled Discord Presence for this workspace');
  });

  const disabler = commands.registerCommand('discord.disable', async () => {
    await disable();
    await window.showInformationMessage('Disabled Discord Presence for this workspace');
  });

  const reConnecter = commands.registerCommand('discord.reconnect', async () => {
    await disable(false);
    await enable(false);
  });

  const disconnect = commands.registerCommand('discord.disconnect', async () => {
    await disable(false);
  });

  context.subscriptions.push(enabler, disabler, reConnecter, disconnect);

  if (!isWorkspaceExcluded && config[CONFIG_KEYS.Enabled]) {
    await login();
  }
}

export function deactivate() {
  cleanUp();
  rpc.destroy();
}
