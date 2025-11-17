import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Photo {
  id: number;
  url: string;
  caption?: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onClose?: () => void;
}

export function PhotoGallery({ photos, onClose }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">Nenhuma foto disponível</p>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="w-full">
      {/* Main Image */}
      <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden mb-4">
        <img
          src={currentPhoto.url}
          alt={currentPhoto.caption || `Foto ${currentIndex + 1}`}
          className="w-full h-96 object-cover"
        />

        {/* Navigation Buttons */}
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Próxima foto"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Photo Counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            aria-label="Fechar galeria"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Caption */}
      {currentPhoto.caption && (
        <p className="text-sm text-gray-600 mb-4">{currentPhoto.caption}</p>
      )}

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex
                  ? "border-blue-500"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <img
                src={photo.url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PhotoGalleryModalProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoGalleryModal({
  photos,
  isOpen,
  onClose,
}: PhotoGalleryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Galeria de Fotos</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          <PhotoGallery photos={photos} />

          <div className="mt-4 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
