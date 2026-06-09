import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style/text-style';
import { FontSize } from '@tiptap/extension-text-style/font-size';
import { FontFamily } from '@tiptap/extension-text-style/font-family';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';

interface InlineRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
}

/**
 * 画布内联富文本编辑器
 *
 * 用于 FreeBlockCard 中双击进入编辑时的轻量 TipTap 编辑器。
 * 支持：加粗、斜体、下划线、换行、文本对齐（左/中/右）、字号、字体
 * 无工具栏，通过快捷键操作（Ctrl+B 加粗, Ctrl+I 斜体, Ctrl+U 下划线）
 * Escape 退出编辑
 */
export default function InlineRichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
}: InlineRichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
      }),
      Placeholder.configure({ placeholder: placeholder || '输入内容...' }),
    ],
    content: value || '<p></p>',
    editable: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    // 点击编辑器外部时退出编辑
    editorProps: {
      attributes: {
        class: 'inline-richtext-editor',
      },
      handleKeyDown: (view, event) => {
        // Escape 退出编辑
        if (event.key === 'Escape') {
          onBlur();
          return true;
        }
        return false;
      },
    },
  });

  // 外部 value 变化时同步（仅初始化时）
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHTML = editor.getHTML();
      if (value !== currentHTML) {
        editor.commands.setContent(value || '<p></p>');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 点击编辑器外部时退出编辑
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onBlur();
      }
    };
    // 延迟绑定，避免双击事件立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onBlur]);

  if (!editor) return null;

  return (
    <div
      ref={containerRef}
      className="inline-richtext-container"
      onClick={(e) => e.stopPropagation()}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
