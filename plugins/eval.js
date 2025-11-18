import syntaxerror from 'syntax-error';
import { format } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);

const evalCommand = {
    name: 'eval',
    category: 'propietario',
    description: 'Executes JavaScript code provided by the owner.',
    aliases: ['>', '=>'],

    async execute({ sock, msg, args, commandName, isOwner, commands, config }) {
        if (!isOwner) {
            return sock.sendMessage(msg.key.remoteJid, { text: "Este comando es solo para el propietario del bot." });
        }

        let _return;
        let _syntax = '';
        const _text = args.join(' ');

        const textToEvaluate = (commandName === '=>' ? 'return ' : '') + _text;

        try {
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const groupMetadata = isGroup ? await sock.groupMetadata(from) : null;

            let i = 15;
            let f = { exports: {} };

            const exec = new (async () => {}).constructor(
                'print', 'msg', 'require', 'sock', 'CustomArray', 'process', 'args', 'groupMetadata', 'module', 'exports', 'argument',
                textToEvaluate
            );

            _return = await exec.call(
                sock,
                (...args) => {
                    if (--i < 1) return;
                    console.log(...args);
                    return sock.sendMessage(msg.key.remoteJid, { text: format(...args) }, { quoted: msg });
                },
                msg,
                require,
                sock,
                CustomArray,
                process,
                args,
                groupMetadata,
                f,
                f.exports,
                { sock, msg, args, commandName, isOwner, commands, config }
            );
        } catch (e) {
            let err = syntaxerror(textToEvaluate, 'Execution Function', {
                allowReturnOutsideFunction: true,
                allowAwaitOutsideFunction: true,
                sourceType: 'module'
            });
            if (err) {
                _syntax = '```' + err + '```\n\n';
            }
            _return = e;
        } finally {
            await sock.sendMessage(msg.key.remoteJid, { text: _syntax + format(_return) }, { quoted: msg });
        }
    }
};

class CustomArray extends Array {
    constructor(...args) {
        if (typeof args[0] == 'number') {
            super(Math.min(args[0], 10000));
        } else {
            super(...args);
        }
    }
}

export default evalCommand;
