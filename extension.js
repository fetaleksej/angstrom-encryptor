'use babel';

const vscode = require('vscode');
const NodeRSA = require('node-rsa')
const NodeCrypto = require('crypto')
const { dirname, basename } = require('path')
const fs  = require('fs');
const Path = require('path')


function encryptConfig(configContext, hexCipherRSA)  {
  const generateRandomByteArray = (count) => Buffer.alloc(count).map(
    () => Math.floor(Math.random() * 256))

  const keyAES = generateRandomByteArray(32)
  const initVector = generateRandomByteArray(16)

  const cipherAES = NodeCrypto.createCipheriv('aes-256-cfb', keyAES, initVector)
  let encryptedContext = cipherAES.update(Buffer.from(configContext));
  encryptedContext = Buffer.concat([encryptedContext, cipherAES.final()]);

  const cipherRSA = new NodeRSA();
  cipherRSA.importKey(Buffer.from(hexCipherRSA.trim(), 'hex'), 'pkcs8-public-der')
  const hexKeyAndInitVector = Buffer.concat(
    [Buffer.from(keyAES), Buffer.from(initVector)]).toString('hex')
  const encryptedKey = Buffer.from(
    cipherRSA.encrypt(hexKeyAndInitVector, 'hex'), 'hex')

  return Buffer.concat([encryptedKey, encryptedContext])
}


function encrypt() {
    const currentTextEditor = vscode.window.activeTextEditor
	if (currentTextEditor === undefined) {
		return;
	}

	const currentPath = currentTextEditor.document.uri.fsPath
    if (currentPath === undefined) {
		vscode.window.showErrorMessage('Please save file before start encrypting')
      return
    }

	const configuration = vscode.workspace.getConfiguration('angstrom-config-encryptor')
    const configFileName = basename(configuration.configFileName)
    if (configFileName === '') {
      vscode.window.showErrorMessage('Please input correct file name of config file')
      return
    }

    const fileName = configuration.keysFilePath
	const hexcipherRSA = fs.readFileSync(fileName,
		{encoding:'utf8', flag:'r'})
    if (hexcipherRSA === null) {
		vscode.window.showErrorMessage(`File "${fileName}" is not exist`)
    }

    const encryptedConfig = encryptConfig(currentTextEditor.document.getText(), hexcipherRSA)
    const storeConfigPath = Path.resolve(dirname(currentPath) + '/' + configFileName)

    fs.writeFile(storeConfigPath, encryptedConfig, 'binary', () => {
		vscode.window.showInformationMessage(
        `Encrypted config file is saved to ${storeConfigPath}., ${currentPath}`)
    })
}

module.exports = {
	activate: (context) => {
        context.subscriptions.push(vscode.commands.registerCommand(
            'angstrom-config-encryptor.encrypt', () => encrypt() ));
    },
	deactivate: () => {},
}