import MembersListContent from "./MembersListContent";

const MembersModal = ({ isOpen, onClose, ...props }) => {
  if (!isOpen) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-40 flex flex-col bg-gray-100 text-black"
    >
      <header
        className="p-4 bg-gray-800 shadow-lg border-b border-gray-200 flex items-center"
      >
        <button
          onClick={onClose}
          className="p-1 rounded-full text-black hover:bg-gray-300 mr-3"
          title="Cerrar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h2 className="font-bold text-lg">
          Miembros del Grupo
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <MembersListContent
          {...props}
        />
      </div>
    </div>
  );
};

export default MembersModal;