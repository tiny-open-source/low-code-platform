import type { GetColumnWidth, SetColumnWidth, UiState } from '@/type';
import BaseService from '@/services/base.service';

const DEFAULT_LEFT_COLUMN_WIDTH = 310;
const MIN_LEFT_COLUMN_WIDTH = 45;
const DEFAULT_RIGHT_COLUMN_WIDTH = 480;
const MIN_RIGHT_COLUMN_WIDTH = 10;

const COLUMN_WIDTH_STORAGE_KEY = '$MagicEditorColumnWidthData';

const defaultColumnWidth = {
  left: DEFAULT_LEFT_COLUMN_WIDTH,
  center: globalThis.document.body.clientWidth - DEFAULT_LEFT_COLUMN_WIDTH - DEFAULT_RIGHT_COLUMN_WIDTH,
  right: DEFAULT_RIGHT_COLUMN_WIDTH,
};
const state = reactive<UiState>({
  uiSelectMode: false,
  showSrc: false,
  zoom: 1,
  stageContainerRect: {
    width: 0,
    height: 0,
  },
  stageRect: {
    width: 375,
    height: 817,
  },
  columnWidth: defaultColumnWidth,
  showGuides: true,
  showRule: true,
  propsPanelSize: 'small',
});
class Ui extends BaseService {
  constructor() {
    super([]);
    globalThis.addEventListener('resize', () => {
      this.setColumnWidth({
        center: 'auto',
      });
    });
    const columnWidthCacheData = globalThis.localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
    if (columnWidthCacheData) {
      try {
        const columnWidthCache = JSON.parse(columnWidthCacheData);
        this.setColumnWidth(columnWidthCache);
      }
      catch (e) {
        console.error(e);
      }
    }
  }

  public get<T>(name: keyof typeof state): T {
    console.log('🚀 ~ Ui ~ state:', (state as any)[name]);
    return (state as any)[name];
  }

  public set<T>(name: keyof typeof state, value: T) {
    if (name === 'columnWidth') {
      this.setColumnWidth(value as unknown as SetColumnWidth);
    }
  }

  private setColumnWidth({ left, center, right }: SetColumnWidth) {
    const columnWidth = {
      ...toRaw(this.get<GetColumnWidth>('columnWidth')),
    };

    if (left) {
      columnWidth.left = Math.max(left, MIN_LEFT_COLUMN_WIDTH);
    }
    if (right) {
      columnWidth.right = Math.max(right, MIN_RIGHT_COLUMN_WIDTH);
    }

    if (!center || center === 'auto') {
      const bodyWidth = globalThis.document.body.clientWidth;
      // 计算中间列的宽度
      columnWidth.center = bodyWidth - (columnWidth?.left || 0) - (columnWidth?.right || 0);
      if (columnWidth.center <= 0) {
        columnWidth.left = defaultColumnWidth.left;
        columnWidth.center = defaultColumnWidth.center;
        columnWidth.right = defaultColumnWidth.right;
      }
    }
    else {
      columnWidth.center = center;
    }

    globalThis.localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(columnWidth));
    state.columnWidth = columnWidth;
  }
}
export type UiService = Ui;
export default new Ui();
