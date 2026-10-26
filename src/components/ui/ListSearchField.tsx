"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { IconButton } from "@/components/ui/IconButton";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";

/** The search box that sits under the page index, in the board layout these
 *  lists follow. Submitting sets `?q=` and returns to page one, because the
 *  page number from the previous result set means nothing in the new one. */
export function ListSearchField({ placeholder, label = "Search this list", scopes, scopeParam = "searchBy", submitLabel = "Search", copyKey, actionKey, submitInField = false }: {
  placeholder: string;
  label?: string;
  copyKey?: TranslationKey;
  actionKey?: TranslationKey;
  scopes?: ReadonlyArray<{ value: string; label: string }>;
  scopeParam?: string;
  submitLabel?: string;
  submitInField?: boolean;
}) {
  const { t } = useLanguage();
  const visiblePlaceholder = copyKey ? t(copyKey) : placeholder;
  const visibleLabel = copyKey ? t(copyKey) : label;
  const visibleAction = actionKey ? t(actionKey) : submitLabel;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTerm = searchParams.get("q") ?? "";
  const [term, setTerm] = useState(activeTerm);
  const activeScope = searchParams.get(scopeParam) ?? scopes?.[0]?.value ?? "";
  const [scope, setScope] = useState(activeScope);

  // A back/forward step or a cleared filter changes the URL under us.
  useEffect(() => { setTerm(activeTerm); }, [activeTerm]);
  useEffect(() => { setScope(activeScope); }, [activeScope]);

  const submit = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    if (scopes) {
      if (scope === scopes[0]?.value) next.delete(scopeParam);
      else next.set(scopeParam, scope);
    }
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <form
      className={`list-search${submitInField ? " is-inline-submit" : ""}`}
      role="search"
      onSubmit={(event) => { event.preventDefault(); submit(term); }}
    >
      {scopes ? <SelectMenu
        id="list-search-scope"
        name={scopeParam}
        className="list-search-scope"
        label="Search field"
        placeholder={scopes[0]?.label ?? "Search field"}
        options={scopes}
        value={scope}
        onChange={setScope}
        hideLabel
        includeEmptyOption={false}
      /> : null}
      <div className="list-search-field">
        {submitInField ? <IconButton className="list-search-submit" type="submit" aria-label={visibleAction}><i className="ms ms-search" aria-hidden="true" /></IconButton> : <i className="ms ms-search" aria-hidden="true" />}
        <input
          type="search"
          name="q"
          value={term}
          placeholder={visiblePlaceholder}
          aria-label={visibleLabel}
          onChange={(event) => setTerm(event.target.value)}
        />
        {activeTerm ? (
          <button type="button" className="list-search-clear" onClick={() => { setTerm(""); submit(""); }} aria-label={copyKey ? t("ownedListingClearSearch") : "Clear search"}>
            <i className="ms ms-close" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {submitInField ? null : <button className="ui-button ui-button--primary ui-button--sm" type="submit">{visibleAction}</button>}
    </form>
  );
}
