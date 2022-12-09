import { basename, parse, sep } from 'path';
import { env, Selection, TextDocument, window, workspace } from 'vscode';
import createGitinfo from 'gitinfo';
import {
  CONFIG_KEYS,
  EMPTY,
  FAKE_EMPTY,
  FILE_SIZES,
  IDLE_IMAGE_KEY,
  REPLACE_KEYS,
  UNKNOWN_GIT_BRANCH,
  UNKNOWN_GIT_REPO_NAME,
  VSCODE_IMAGE_KEY,
  VSCODE_INSIDERS_IMAGE_KEY
} from './constants';
import { log, LogLevel } from './logger';
import { getConfig, resolveFileIcon, toLower, toTitle, toUpper } from './util';


export async function activity(previous: import('discord-rpc').Presence = {}): Promise<import('discord-rpc').Presence>
{
  const config = getConfig();

  const swapBigAndSmallImage = config[CONFIG_KEYS.SwapBigAndSmallImage];

  const appName = env.appName;

  const defaultSmallImageKey = appName.includes('Insiders')
    ? VSCODE_INSIDERS_IMAGE_KEY
    : VSCODE_IMAGE_KEY;

  const defaultSmallImageText = config[CONFIG_KEYS.SmallImage].replace(REPLACE_KEYS.AppName, appName);
  const defaultLargeImageText = config[CONFIG_KEYS.LargeImageIdling];
  
  let state: import('discord-rpc').Presence = {
    details: await details(CONFIG_KEYS.DetailsIdling, CONFIG_KEYS.DetailsEditing),
    startTimestamp: config[CONFIG_KEYS.RemoveTimestamp] ? undefined : previous.startTimestamp ?? Date.now(),
    largeImageKey: IDLE_IMAGE_KEY,
    largeImageText: defaultLargeImageText,
    smallImageKey: defaultSmallImageKey,
    smallImageText: defaultSmallImageText
  };

  if (swapBigAndSmallImage)
  {
    state = {
      ...state,
      largeImageKey: defaultSmallImageKey,
      largeImageText: defaultSmallImageText,
      smallImageKey: IDLE_IMAGE_KEY,
      smallImageText: defaultLargeImageText
    };
  }

  if (window.activeTextEditor)
  {
    const largeImageKey = resolveFileIcon(window.activeTextEditor.document);

    const largeImageText = config[CONFIG_KEYS.LargeImage]
      .replace(REPLACE_KEYS.LanguageLowerCase, toLower(largeImageKey))
      .replace(REPLACE_KEYS.LanguageTitleCase, toTitle(largeImageKey))
      .replace(REPLACE_KEYS.LanguageUpperCase, toUpper(largeImageKey))
      .padEnd(2, FAKE_EMPTY);

    state = {
      ...state,
      details: await details(CONFIG_KEYS.DetailsIdling, CONFIG_KEYS.DetailsEditing),
      state: await details(
        CONFIG_KEYS.LowerDetailsIdling,
        CONFIG_KEYS.LowerDetailsEditing
      )
    };

    if (swapBigAndSmallImage)
    {
      state = {
        ...state,
        smallImageKey: largeImageKey,
        smallImageText: largeImageText
      };
    }
    else
    {
      state = {
        ...state,
        largeImageKey,
        largeImageText
      };
    }

    log(LogLevel.Trace, `VSCode language id: ${window.activeTextEditor.document.languageId}`);
  }

  return state;
}

async function details(idling: CONFIG_KEYS, editing: CONFIG_KEYS)
{
  const config = getConfig();

  let raw = (config[idling] as string) ?? FAKE_EMPTY;

  if (window.activeTextEditor)
  {
    const fileName = basename(window.activeTextEditor.document.fileName);
    const { dir } = parse(window.activeTextEditor.document.fileName);
    const split = dir.split(sep);
    const dirName = split[split.length - 1];

    const noWorkspaceFound = config[CONFIG_KEYS.LowerDetailsNoWorkspaceFound];
    const workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
    const workspaceFolderName = workspaceFolder?.name ?? noWorkspaceFound;
    const workspaceName = workspace.name?.replace(REPLACE_KEYS.VSCodeWorkspace, EMPTY) ?? workspaceFolderName;

    const workspaceAndFolder = `${workspaceName}${
      workspaceFolderName === FAKE_EMPTY ? '' : ` - ${workspaceFolderName}`
    }`;

    const fileIcon = resolveFileIcon(window.activeTextEditor.document);

    raw = config[editing] as string;

    if (workspaceFolder)
    {
      const { name } = workspaceFolder;
      const relativePath = workspace.asRelativePath(window.activeTextEditor.document.fileName).split(sep);

      relativePath.splice(-1, 1);

      raw = raw.replace(REPLACE_KEYS.FullDirName, `${name}${sep}${relativePath.join(sep)}`);
    }

    try
    {
      raw = await fileDetails(raw, window.activeTextEditor.document, window.activeTextEditor.selection);
    }
    catch (error)
    {
      log(LogLevel.Error, `Failed to generate file details: ${error as string}`);
    }

    raw = raw
      .replace(REPLACE_KEYS.FileName, fileName)
      .replace(REPLACE_KEYS.DirName, dirName)
      .replace(REPLACE_KEYS.Workspace, workspaceName)
      .replace(REPLACE_KEYS.WorkspaceFolder, workspaceFolderName)
      .replace(REPLACE_KEYS.WorkspaceAndFolder, workspaceAndFolder)
      .replace(REPLACE_KEYS.LanguageLowerCase, toLower(fileIcon))
      .replace(REPLACE_KEYS.LanguageTitleCase, toTitle(fileIcon))
      .replace(REPLACE_KEYS.LanguageUpperCase, toUpper(fileIcon));
  }

  return raw;
}

async function fileDetails(_raw: string, document: TextDocument, selection: Selection)
{
  let raw = _raw.slice();

  if (raw.includes(REPLACE_KEYS.TotalLines))
  {
    raw = raw.replace(REPLACE_KEYS.TotalLines, document.lineCount.toLocaleString());
  }

  if (raw.includes(REPLACE_KEYS.CurrentLine))
  {
    raw = raw.replace(REPLACE_KEYS.CurrentLine, (selection.active.line + 1).toLocaleString());
  }

  if (raw.includes(REPLACE_KEYS.CurrentColumn))
  {
    raw = raw.replace(REPLACE_KEYS.CurrentColumn, (selection.active.character + 1).toLocaleString());
  }

  if (raw.includes(REPLACE_KEYS.FileSize))
  {
    let size: number;
    let currentDivision = 0;

    try
    {
      ({ size } = await workspace.fs.stat(document.uri));
    }
    catch
    {
      size = document.getText().length;
    }

    const originalSize = size;

    if (originalSize > 1000)
    {
      size /= 1000;
      currentDivision++;
      while (size > 1000)
      {
        currentDivision++;
        size /= 1000;
      }
    }

    raw = raw.replace(
      REPLACE_KEYS.FileSize,
      `${originalSize > 1000 ? size.toFixed(2) : size}${FILE_SIZES[currentDivision]}`
    );
  }

  const { dir } = parse(document.fileName);

  log(LogLevel.Info, `Reading for git repo at ${dir}/.git`);

  let name = UNKNOWN_GIT_REPO_NAME as string;
  let branch = UNKNOWN_GIT_BRANCH as string;

  try
  {
    const gitinfo = createGitinfo({
      gitPath: dir
    });

    name = gitinfo.getName() as string;
    branch = gitinfo.getBranchName() as string;
  }
  catch
  {
    //
  }

  raw = raw.replace(REPLACE_KEYS.GitRepoName, name);
  raw = raw.replace(REPLACE_KEYS.GitBranch, branch);

  return raw;
}
