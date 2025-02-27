import registerPromiseWorker from 'promise-worker/register';
import { FigmaParser } from '../resolver/lanhu';

const parser = new FigmaParser();
registerPromiseWorker((code: any) => {
  if (code.type === 'parse') {
    return {
      code: 200,
      message: 'success',
      data: parser.parse(typeof code === 'string' ? JSON.parse(code) : code),
    };
  }
});
