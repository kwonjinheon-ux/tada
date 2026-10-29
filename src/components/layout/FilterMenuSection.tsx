"use client";

import { mobileDrawerClasses } from "@/components/MobileDrawer";

export type FilterMenuItem<Value extends string = string> = {
  value: Value;
  label: string;
  /** Icon-font class, e.g. "ms-grid-view". */
  icon: string;
  /** Renders the row as a link instead of a button. */
  href?: string;
};

type FilterMenuSectionProps<Value extends string> = {
  title: string;
  items: FilterMenuItem<Value>[];
  activeValue: Value;
  onSelect?: (value: Value) => void;
  /** Desktop rail hooks for this section, e.g. "shop-type-filter market-type-filter". */
  className?: string;
  listClassName?: string;
  /** Keeps the per-row hook `${prefix}-${value}` that a section's desktop styles key on. */
  itemClassPrefix?: string;
  /** Wraps the glyph in a section's desktop illustration frame. */
  iconFrameClassName?: string;
};

const joinClasses = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

/**
 * The one list of sub-category rows used by every mobile filter drawer — Market
 * type and category, Community category, Services type. Its phone geometry
 * (row height, gap, icon slot, type size, selected state) is defined once,
 * under `.filter-menu-section` in styles.css, so the three drawers cannot drift.
 */
export function FilterMenuSection<Value extends string>({ title, items, activeValue, onSelect, className, listClassName, itemClassPrefix, iconFrameClassName }: FilterMenuSectionProps<Value>) {
  return <section className={joinClasses("filter-block", "filter-menu-section", className)}>
    <h2>{title}</h2>
    <div className={joinClasses("filter-list", "filter-menu-list", listClassName)}>
      {items.map(({ value, label, icon, href }) => {
        const selected = activeValue === value;
        const rowClassName = joinClasses("filter-menu-row", mobileDrawerClasses.menuItem, mobileDrawerClasses.staggerItem, itemClassPrefix && `${itemClassPrefix}-${value}`, selected && "is-selected");
        const glyph = <i className={`ms ${icon}`} aria-hidden="true" />;
        const content = <>
          {iconFrameClassName ? <span className={iconFrameClassName}>{glyph}</span> : glyph}
          <span className={mobileDrawerClasses.menuLabel}>{label}</span>
        </>;
        return href
          ? <a key={value} href={href} className={rowClassName} aria-current={selected ? "page" : undefined}>{content}</a>
          : <button key={value} type="button" className={rowClassName} aria-pressed={selected} onClick={() => onSelect?.(value)}>{content}</button>;
      })}
    </div>
  </section>;
}
