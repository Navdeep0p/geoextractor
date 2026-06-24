import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface UploaderProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onImageSelect, disabled }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageSelect(acceptedFiles[0]);
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    disabled
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <UploadCloud className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
      <p className="text-lg font-medium text-neutral-200">
        {isDragActive ? "Drop the image here..." : "Drag & drop an image, or click to select"}
      </p>
      <p className="text-sm text-neutral-500 mt-2">Supports JPG, PNG with or without EXIF</p>
    </div>
  );
};
