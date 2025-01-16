import button from '../../../packages/runtime-ui/src/button/src/form-config';
import container from '../../../packages/runtime-ui/src/container/src/form-config';
import img from '../../../packages/runtime-ui/src/img/src/form-config';
import overlay from '../../../packages/runtime-ui/src/overlay/src/form-config';
import page from '../../../packages/runtime-ui/src/page/src/form-config';
import qrcode from '../../../packages/runtime-ui/src/qrcode/src/form-config';
import text from '../../../packages/runtime-ui/src/text/src/form-config';

(function () {
  const configs = {
    page,
    text,
    container,
    button,
    overlay,
    img,
    qrcode,
  };
  window.lowcodePresetConfigs = configs;
})();
// # sourceMappingURL=config-entry.js.map
