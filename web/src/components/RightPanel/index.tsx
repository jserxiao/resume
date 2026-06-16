import { useResumeStore } from '@/store';
import { TPL_ICON, TPL_AVATAR, TPL_FLEXBOX } from '@/utils/constants';
import BlockDetailPanel from './BlockDetailPanel';
import GroupPanel from './GroupPanel';
import MultiSelectPanel from './MultiSelectPanel';
import CanvasLayoutPanel from './CanvasLayoutPanel';
import './index.less';

export default function RightPanel() {
  const {
    resume,
    blockTemplates,
    editor,
  } = useResumeStore();

  if (!resume) return null;

  const selectedBlockIds = editor.selectedBlockIds;
  const isMultiSelect = selectedBlockIds.length > 1;
  const selectedGroupId = editor.selectedGroupId;

  // 获取选中的分组
  const selectedGroup = selectedGroupId
    ? resume.groups.find((g) => g.id === selectedGroupId)
    : null;

  // 获取选中的块
  const selectedBlocks = selectedBlockIds
    .map(id => resume.blocks.find(b => b.id === id))
    .filter(Boolean) as typeof resume.blocks;

  const selectedBlock = selectedBlocks.length === 1 ? selectedBlocks[0] : null;

  // 是否为 antd 图标块
  const isIconBlock = selectedBlock?.templateId === TPL_ICON;
  // 是否为头像块
  const isAvatarBlock = selectedBlock?.templateId === TPL_AVATAR;
  // 是否为弹性盒子块
  const isFlexboxBlock = selectedBlock?.templateId === TPL_FLEXBOX;

  // 判断是否选中了分组
  const isGroupMode = !!selectedGroup;

  return (
    <div className="right-panel" style={{ width: editor.rightPanelWidth }}>
      {isGroupMode ? (
        /* 选中分组 */
        <GroupPanel group={selectedGroup!} />
      ) : isMultiSelect ? (
        /* 多选模式 */
        <MultiSelectPanel selectedBlockIds={selectedBlockIds} selectedBlocks={selectedBlocks} />
      ) : !selectedBlock ? (
        /* 无选中 - 画布设置 */
        <CanvasLayoutPanel resume={resume} />
      ) : (
        /* 单选模式 - 统一详情面板 */
        <BlockDetailPanel
          block={selectedBlock}
          template={blockTemplates.find((t) => t.id === selectedBlock.templateId)}
          isIconBlock={isIconBlock}
          isAvatarBlock={isAvatarBlock}
          isFlexboxBlock={isFlexboxBlock}
        />
      )}
    </div>
  );
}
