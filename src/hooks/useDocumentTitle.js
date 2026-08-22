import { useEffect } from "react";
import { BRAND } from "../config/embedBranding";

// Sets the browser tab title to "<name> (<brand>)" while a name is present, and
// restores the default "<brand>" when it clears or the page unmounts. <brand> is
// "Scenic" unless an embed overrode it via ?brand= (see config/embedBranding).
export default function useDocumentTitle(name) {
  useEffect(() => {
    if (name) document.title = `${name} (${BRAND})`;
    return () => {
      document.title = BRAND;
    };
  }, [name]);
}
