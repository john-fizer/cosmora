import React, { useEffect, useState } from "react";
import { delayRender, continueRender } from "remotion";

type Loader<P> = () => Promise<{ default: React.ComponentType<P> } | React.ComponentType<P>>;

/**
 * Stand-in for next/dynamic. Next's `{ ssr: false }` code-splitting has no
 * meaning in a Remotion render (everything runs client-side already); this
 * just resolves the import and holds the frame via delayRender until the
 * real component is ready, so nothing is captured mid-load.
 */
export default function dynamic<P extends object>(loader: Loader<P>, _opts?: { ssr?: boolean }) {
  return function DynamicComponent(props: P) {
    const [Comp, setComp] = useState<React.ComponentType<P> | null>(null);

    useEffect(() => {
      const handle = delayRender("next-dynamic-import");
      loader()
        .then((mod) => {
          const resolved = "default" in mod ? mod.default : mod;
          setComp(() => resolved as React.ComponentType<P>);
          continueRender(handle);
        })
        .catch((err) => {
          continueRender(handle);
          throw err;
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!Comp) return null;
    return <Comp {...props} />;
  };
}
