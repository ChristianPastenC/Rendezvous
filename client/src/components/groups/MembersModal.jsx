import MembersListContent from "./MembersListContent";
import { BackArrowIcon } from "../../assets/Icons";

const MembersModal = ({ isOpen, onClose, ...props }) => {
  if (!isOpen) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-40 flex flex-col bg-white text-gray-900"
    >
      <header
        className="p-4 bg-white shadow-sm border-b border-gray-200 flex items-center sticky top-0"
      >
        <button
          onClick={onClose}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 mr-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Cerrar"
        >
          <BackArrowIcon className="w-6 h-6" />
        </button>
        <h2 className="font-semibold text-lg text-gray-900">
          Miembros del Grupo
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full"
      >
        <MembersListContent
          {...props}
        />
      </div>
    </div>
  );
};

export default MembersModal;