import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  EllipsisHorizontalIcon,
  TrashIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function ChatActions({ chat, onDelete, onArchive, onMarkAsRead }) {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openModal();
        }}
        className="p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <EllipsisHorizontalIcon className="h-5 w-5 text-white/70" />
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[1000]" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden glass-panel rounded-2xl p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white/90 mb-4"
                  >
                    Chat Actions
                  </Dialog.Title>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        onMarkAsRead(chat);
                        closeModal();
                      }}
                      className="flex items-center w-full px-4 py-3 text-white/90 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <CheckCircleIcon className="mr-3 h-5 w-5" />
                      Mark as Read
                    </button>

                    <button
                      onClick={() => {
                        onArchive(chat);
                        closeModal();
                      }}
                      className="flex items-center w-full px-4 py-3 text-white/90 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ArchiveBoxIcon className="mr-3 h-5 w-5" />
                      Archive
                    </button>

                    <button
                      onClick={() => {
                        onDelete(chat);
                        closeModal();
                      }}
                      className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <TrashIcon className="mr-3 h-5 w-5" />
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
