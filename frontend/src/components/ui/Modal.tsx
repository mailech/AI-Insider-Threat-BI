import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: "center" | "right"; // 'center' for modal, 'right' for drawer
}

export function Modal({ isOpen, onClose, title, children, position = "center" }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent scrolling behind modal
    }
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Basic focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDrawer = position === "right";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal/Drawer Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={`absolute bg-onyx border border-graphite shadow-none flex flex-col transition-transform ${
          isDrawer
            ? "inset-y-0 right-0 w-full max-w-md border-l border-t-0 border-b-0 border-r-0"
            : "relative w-full max-w-lg"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-graphite">
          {title && (
            <h2 className="text-subheading font-serif text-chalk tracking-tight">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-fog hover:text-bone transition-colors outline-none focus:glow-lime p-1 rounded-sm ml-auto"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
