
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2 } from 'lucide-react';

type EventFormImageProps = {
  imageUrl: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
};

const EventFormImage = ({ imageUrl, onImageChange, isUploading }: EventFormImageProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
    onImageChange(e);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Event Image</label>
      <div className="flex items-center gap-4">
        {imageUrl && (
          <div className="w-24 h-24 overflow-hidden rounded-md border">
            <img 
              src={imageUrl} 
              alt="Event" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/600x400/667eea/ffffff?text=Event+Image";
              }}
            />
          </div>
        )}
        <div className="flex-1">
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('image')?.click()}
            className="w-full"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus className="mr-2 h-4 w-4" />
                {imageUrl ? 'Change Image' : 'Upload Image'}
              </>
            )}
          </Button>
          {imageFile && (
            <p className="mt-1 text-sm text-gray-500">
              {imageFile.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventFormImage;
