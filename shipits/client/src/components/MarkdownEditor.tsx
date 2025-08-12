import React, { useMemo } from "react";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { ImageUpload } from "@/components/ImageUpload";
import { FileUpload } from "@/components/FileUpload";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  withUploads?: boolean;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className = "",
  withUploads = false
}: MarkdownEditorProps) {
  const extraCommands = useMemo(() => {
    return [];
  }, []);

  return (
    <div className={`space-y-3 ${className}`} data-color-mode="light">
      <div className="rounded-md border">
        <MDEditor
          value={value}
          onChange={(v = "") => onChange(v)}
          height={260}
          previewOptions={{ rehypePlugins: [[rehypeSanitize, {}]] }}
          textareaProps={{ placeholder: placeholder || "Write with Markdown…" }}
          extraCommands={extraCommands}
        />
      </div>

      {withUploads && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-md border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Images</p>
              <span className="text-xs text-gray-500">Insert as Markdown</span>
            </div>
            <ImageUpload
              onImagesUploaded={(imgs) => {
                const markdown = imgs
                  .map((img) => {
                    const src = img.data || (img as any).url || '';
                    return `![${img.originalName}](${src})`;
                  })
                  .join("\n\n");
                onChange((value || "") + (value ? "\n\n" : "") + markdown);
              }}
              maxImages={10}
            />
          </div>
          <div className="p-3 rounded-md border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Attachments</p>
              <span className="text-xs text-gray-500">Insert as links</span>
            </div>
            <FileUpload
              onFilesUploaded={(files) => {
                const markdown = files
                  .map((f) => {
                    const url = f.url || f.data || "";
                    const label = f.originalName || f.filename;
                    return url ? `[${label}](${url})` : label;
                  })
                  .join("\n");
                onChange((value || "") + (value ? "\n\n" : "") + markdown);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;

