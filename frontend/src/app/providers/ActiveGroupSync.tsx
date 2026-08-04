import { useEffect } from "react";
import { useActiveGroup, useActiveGroupSetter } from "./ActiveGroupContext";
import { useGroupList } from "./GroupListContext";

/**
 * Renders nothing. Validates the (optimistically restored, see
 * `ActiveGroupContext` A2) active group id against the fetched group list
 * once it settles (A3): clears it if the group is no longer present (the
 * user left it, or it was deleted). Never auto-picks a group when none is
 * active — `/groups` stays the deliberate entry point.
 */
export function ActiveGroupSync() {
  const groupId = useActiveGroup();
  const setGroupId = useActiveGroupSetter();
  const { groups, loading, error } = useGroupList();

  useEffect(() => {
    if (loading || error) return;
    if (groupId && !groups.some((group) => group.id === groupId)) {
      setGroupId(null);
    }
  }, [groupId, groups, loading, error, setGroupId]);

  return null;
}
