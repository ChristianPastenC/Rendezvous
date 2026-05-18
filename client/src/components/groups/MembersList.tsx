// client/src/components/groups/MembersList.jsx
import MembersListContent, { type MembersListContentProps } from "./MembersListContent";

const MembersList = (props: MembersListContentProps) => (
  <aside
    className="hidden md:flex w-64 bg-gray-100 p-4 border-l border-gray-400 flex-shrink-0 flex-col"
  >
    <MembersListContent
      {...props}
    />
  </aside>
);
export default MembersList;