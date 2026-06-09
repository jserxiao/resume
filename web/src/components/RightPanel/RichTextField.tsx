import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style/text-style';
import { FontSize } from '@tiptap/extension-text-style/font-size';
import { FontFamily } from '@tiptap/extension-text-style/font-family';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Button, Tooltip, Divider, Select } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  FontSizeOutlined,
  FontColorsOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';
import { FONT_SIZE_OPTIONS, FONT_FAMILY_OPTIONS } from '@/utils/tiptapExtensions';
import './RichTextField.less';

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextField({
  value,
  onChange,
  placeholder,
  disabled,
}: RichTextFieldProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      TextStyle,
      FontSize,
      FontFamily,
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
      }),
      Placeholder.configure({ placeholder: placeholder || '输入内容...' }),
    ],
    content: value || '<p></p>',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 外部 value 变化时同步
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentHTML = editor.getHTML();
      if (value !== currentHTML) {
        editor.commands.setContent(value || '<p></p>');
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  // 获取当前字号
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '';
  // 获取当前字体
  const currentFontFamily = (() => {
    const raw = editor.getAttributes('textStyle').fontFamily || '';
    const match = FONT_FAMILY_OPTIONS.find(opt => opt.value && raw.toLowerCase().startsWith(opt.value.split(',')[0].trim().toLowerCase().replace(/"/g, '')));
    return match ? match.value : raw;
  })();

  const toolbarButtons: Array<
    | { type: 'button'; icon: React.ReactNode; isActive: boolean; onClick: () => void; title: string }
    | { type: 'divider' }
    | { type: 'fontSize' }
    | { type: 'fontFamily' }
  > = [
    // 字体选择
    { type: 'fontFamily' },
    // 字号选择
    { type: 'fontSize' },
    // 分隔线
    { type: 'divider' },
    // 文本样式组
    {
      type: 'button',
      icon: <BoldOutlined />,
      isActive: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
      title: '加粗',
    },
    {
      type: 'button',
      icon: <ItalicOutlined />,
      isActive: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
      title: '斜体',
    },
    {
      type: 'button',
      icon: <UnderlineOutlined />,
      isActive: editor.isActive('underline'),
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      title: '下划线',
    },
    // 分隔线
    { type: 'divider' },
    // 对齐组
    {
      type: 'button',
      icon: <AlignLeftOutlined />,
      isActive: editor.isActive({ textAlign: 'left' }),
      onClick: () => editor.chain().focus().setTextAlign('left').run(),
      title: '左对齐',
    },
    {
      type: 'button',
      icon: <AlignCenterOutlined />,
      isActive: editor.isActive({ textAlign: 'center' }),
      onClick: () => editor.chain().focus().setTextAlign('center').run(),
      title: '居中对齐',
    },
    {
      type: 'button',
      icon: <AlignRightOutlined />,
      isActive: editor.isActive({ textAlign: 'right' }),
      onClick: () => editor.chain().focus().setTextAlign('right').run(),
      title: '右对齐',
    },
    // 分隔线
    { type: 'divider' },
    // 列表组
    {
      type: 'button',
      icon: <UnorderedListOutlined />,
      isActive: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      title: '无序列表',
    },
    {
      type: 'button',
      icon: <OrderedListOutlined />,
      isActive: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      title: '有序列表',
    },
  ];

  return (
    <div className="rich-text-field">
      <div className="rich-text-field-toolbar">
        {toolbarButtons.map((btn, idx) => {
          if (btn.type === 'divider') {
            return <Divider key={`div-${idx}`} type="vertical" style={{ margin: '0 2px', height: 16 }} />;
          }
          if (btn.type === 'fontSize') {
            return (
              <Select
                key="font-size"
                size="small"
                value={currentFontSize || undefined}
                placeholder="字号"
                onChange={(val: string) => {
                  if (val) {
                    editor.chain().focus().setFontSize(val).run();
                  } else {
                    editor.chain().focus().unsetFontSize().run();
                  }
                }}
                options={FONT_SIZE_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: opt.value,
                }))}
                className="rtf-select rtf-select-fontsize"
                suffixIcon={<FontSizeOutlined style={{ fontSize: 10 }} />}
                popupMatchSelectWidth={false}
              />
            );
          }
          if (btn.type === 'fontFamily') {
            return (
              <Select
                key="font-family"
                size="small"
                value={currentFontFamily || undefined}
                placeholder="字体"
                onChange={(val: string) => {
                  if (val) {
                    editor.chain().focus().setFontFamily(val).run();
                  } else {
                    editor.chain().focus().unsetFontFamily().run();
                  }
                }}
                options={FONT_FAMILY_OPTIONS.map((opt) => ({
                  label: opt.value ? <span style={{ fontFamily: opt.value }}>{opt.label}</span> : opt.label,
                  value: opt.value,
                }))}
                className="rtf-select rtf-select-fontfamily"
                suffixIcon={<FontColorsOutlined style={{ fontSize: 10 }} />}
                popupMatchSelectWidth={false}
              />
            );
          }
          return (
            <Tooltip key={btn.title} title={btn.title}>
              <Button
                type={btn.isActive ? 'primary' : 'text'}
                size="small"
                icon={btn.icon}
                onClick={btn.onClick}
                className={`rtf-btn ${btn.isActive ? 'active' : ''}`}
              />
            </Tooltip>
          );
        })}
      </div>
      <EditorContent editor={editor} className="rich-text-field-editor" />
    </div>
  );
}
