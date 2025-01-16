import button from '../../../packages/runtime-ui/src/button/src/index.vue';
import container from '../../../packages/runtime-ui/src/container/src/Container.vue';
import img from '../../../packages/runtime-ui/src/img/src/index.vue';
import overlay from '../../../packages/runtime-ui/src/overlay/src/index.vue';
import page from '../../../packages/runtime-ui/src/page/src/index.vue';
import qrcode from '../../../packages/runtime-ui/src/qrcode/src/index.vue';
import text from '../../../packages/runtime-ui/src/text/src/index.vue';

const components = {
  page,
  text,
  container,
  button,
  overlay,
  img,
  qrcode,
};
const plugins = {};
const entry = {
  components,
  plugins,
};
window.lowcodePresetComponents = entry;
export default entry;
// # sourceMappingURL=comp-entry.js.map
