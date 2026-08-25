"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The search box that sits under the page index, in the board layout these
 *  lists follow. Submitting sets `?q=` and returns to page one, because the
 *  page number from the previous result set means nothing in the new one. */
export function ListSearchField({ placeholder, label = "Search this list" }: { placeholder: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTerm = searchParams.get("q") ?? "";
  const [term, setTerm] = useState(activeTerm);

  // A back/forward step or a cleared filter changes the URL under us.
  useEffect(() => { setTerm(activeTerm); }, [activeTerm]);

  const submit = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <form
      className="list-search"
      role="search"
      onSubmit={(event) => { event.preventDefault(); submit(term); }}
    >
      <label className="list-search-field">
        <i className="ti ti-search" aria-hidden="true" />
        <input
          type="search"
          name="q"
          value={term}
          placeholder={placeholder}
          aria-label={label}
          onChange={(event) => setTerm(event.target.value)}
        />
        {activeTerm ? (
          <button type="button" className="list-search-clear" onClick={() => { setTerm(""); submit(""); }} aria-label="Clear search">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        ) : null}
      </label>
      <button className="ui-button ui-button--primary ui-button--sm" type="submit">Search</button>
    </form>
  );
}
