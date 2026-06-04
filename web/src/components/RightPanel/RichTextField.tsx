import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Button, Tooltip } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';
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
      Link.configure({ openOnClick: false }),
      Underline,
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

  const toolbarButtons = [
    {
      icon: <BoldOutlined />,
      isActive: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
      title: '加粗',
    },
    {
      icon: <ItalicOutlined />,
      isActive: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
      title: '斜体',
    },
    {
      icon: <UnderlineOutlined />,
      isActive: editor.isActive('underline'),
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      title: '下划线',
    },
    {
      icon: <UnorderedListOutlined />,
      isActive: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      title: '无序列表',
    },
    {
      icon: <OrderedListOutlined />,
      isActive: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      title: '有序列表',
    },
  ];

  return (
    <div className="rich-text-field">
      <div className="rich-text-field-toolbar">
        {toolbarButtons.map((btn) => (
          <Tooltip key={btn.title} title={btn.title}>
            <Button
              type={btn.isActive ? 'primary' : 'text'}
              size="small"
              icon={btn.icon}
              onClick={btn.onClick}
              className={`rtf-btn ${btn.isActive ? 'active' : ''}`}
            />
          </Tooltip>
        ))}
      </div>
      <EditorContent editor={editor} className="rich-text-field-editor" />
    </div>
  );
}
