import { useEffect } from "react";

// Sets the browser tab title to "<name> (Scenic)" while a name is present, and
// restores the default "Scenic" when it clears or the page unmounts.
export default function useDocumentTitle(name) {
  useEffect(() => {
    if (name) document.title = `${name} (Scenic)`;
    return () => {
      document.title = "Scenic";
    };
  }, [name]);
}
