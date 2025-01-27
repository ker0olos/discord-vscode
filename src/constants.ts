import LANG from './data/languages.json';

export const CLIENT_ID = '383226320970055681' as const;

export const KNOWN_EXTENSIONS: { [key: string]: { image: string } } = LANG.KNOWN_EXTENSIONS;
export const KNOWN_LANGUAGES: { language: string, image: string }[] = LANG.KNOWN_LANGUAGES;

export const EMPTY = '' as const;
export const FAKE_EMPTY = '\u200b\u200b' as const;
export const FILE_SIZES = [' bytes', 'kb', 'mb', 'gb', 'tb'] as const;

export const VSCODE_IMAGE_KEY = 'vscode' as const;
export const IDLE_IMAGE_KEY = 'vscode-big' as const;
export const VSCODE_INSIDERS_IMAGE_KEY = 'vscode-insiders' as const;

export const enum REPLACE_KEYS {
	FileName = '{file_name}',
	DirName = '{dir_name}',
	FullDirName = '{full_dir_name}',
	Workspace = '{workspace}',
	VSCodeWorkspace = '(Workspace)',
	WorkspaceFolder = '{workspace_folder}',
	WorkspaceAndFolder = '{workspace_and_folder}',
	LanguageLowerCase = '{lang}',
	LanguageTitleCase = '{Lang}',
	LanguageUpperCase = '{LANG}',
	TotalLines = '{total_lines}',
	CurrentLine = '{current_line}',
	CurrentColumn = '{current_column}',
	FileSize = '{file_size}',
	AppName = '{app_name}',
	GitRepo = '{git_repo}',
}

export const enum CONFIG_KEYS {
	Enabled = 'enabled',
	DetailsEditing = 'detailsEditing',
	LowerDetailsEditing = 'lowerDetailsEditing',
	LowerDetailsNoWorkspaceFound = 'lowerDetailsNoWorkspaceFound',
	LargeImage = 'largeImage',
	SmallImage = 'smallImage',
	SuppressNotifications = 'suppressNotifications',
	SwapBigAndSmallImage = 'swapBigAndSmallImage',
	RemoveTimestamp = 'removeTimestamp',
	ButtonEnabled = 'buttonEnabled',
	ButtonLabel = 'buttonLabel',
	ButtonUrl = 'buttonUrl',
}
