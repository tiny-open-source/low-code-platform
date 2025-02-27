import PromiseWorker from 'promise-worker';
import MyWorker from './worker?worker';

const worker = new MyWorker();
const promiseWorker = new PromiseWorker(worker);
function parse(code: any) {
  console.log('🚀 ~ parse ~ message:', typeof code === 'string' ? code : JSON.stringify(code));
  return promiseWorker.postMessage({
    type: 'parse',
    message: typeof code === 'string' ? code : JSON.stringify(code),
  });
}

export {
  parse,
};
