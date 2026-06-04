import { useState, type KeyboardEvent } from 'react';
import { Input, Tag } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import './TagListField.less';

interface TagListFieldProps {
  value: string;          // 逗号分隔的标签
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TagListField({
  value,
  onChange,
  placeholder,
  disabled,
}: TagListFieldProps) {
  const [inputValue, setInputValue] = useState('');
  const tags = value.split(',').filter(Boolean);

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags.join(','));
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(','));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="tag-list-field">
      <div className="tag-list-field-tags">
        {tags.map((tag, index) => (
          <Tag
            key={index}
            closable={!disabled}
            onClose={() => removeTag(index)}
            closeIcon={<CloseOutlined />}
            color="blue"
          >
            {tag}
          </Tag>
        ))}
      </div>
      {!disabled && (
        <Input
          className="tag-list-field-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder || '输入标签，回车添加' : ''}
          size="small"
          variant="borderless"
        />
      )}
    </div>
  );
}
