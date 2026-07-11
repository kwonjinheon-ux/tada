# TADA Responsive Breakpoint System

This document is the sizing standard for TADA. Future layout, spacing, and responsive behavior should follow these breakpoints.

## 1. Breakpoint System

React + CSS framework 기준이며 Tailwind에도 적용 가능하다.

| Name | Width | Device | Usage |
| --- | --- | --- | --- |
| `xs` | `< 375px` | Small Mobile | 최소 지원 |
| `sm` | `375px+` | Mobile | Primary Mobile |
| `md` | `768px+` | Tablet | Layout Transition |
| `lg` | `1024px+` | Desktop | Main Desktop |
| `xl` | `1280px+` | Large Desktop | Full Experience |
| `2xl` | `1536px+` | Wide Screen | Admin / Analytics |

## 2. Responsive Architecture Principle

React에서는 페이지를 모바일용, 데스크탑용으로 따로 만들지 않는다.

```txt
Mobile Page
Desktop Page
```

위 방식은 사용하지 않는다.

대신 같은 컴포넌트를 유지하고, responsive props와 CSS로 레이아웃만 바꾼다.

```txt
Same Component
        |
Responsive Props
        |
Different Layout
```

예:

```txt
<ProductCard />

Mobile
  -> Compact Card

Desktop
  -> Detailed Card
```

## 3. Layout System

### Mobile Layout Principle

기본은 single column + full width.

```txt
Container
  -> Stack Layout
```

```css
display: flex;
flex-direction: column;
```

모바일 기본 horizontal space:

```css
padding-left: 16px;
padding-right: 16px;
```

### Desktop Layout Principle

Desktop은 container + grid system을 기준으로 한다.

```css
max-width: 1280px;
margin: auto;
```

```css
grid-template-columns: repeat(4, 1fr);
```

## 4. React Component Responsive Rules

모든 component는 base component + responsive variant 구조로 만든다.

```txt
Base Component
+
Responsive Variant
```

### Product Card

Component:

```jsx
<ProductCard />
```

Mobile variant:

```jsx
variant="compact"
```

Mobile 표시:

```txt
Image
Title
Price
Location
Charge
```

Desktop variant:

```jsx
variant="expanded"
```

Desktop 표시:

```txt
Image
Title
Description
Price
Seller
Distance
Charge
Save Button
```

React 예:

```jsx
<ProductCard variant={isMobile ? "compact" : "expanded"} />
```

## 5. Navigation System

### Mobile

```jsx
<MobileBottomNav />
```

```css
position: fixed;
bottom: 0;
height: 64px;
```

구성:

```txt
Discover
Sell
Messages
Saved
Profile
```

### Desktop

```jsx
<DesktopNavbar />
```

구성:

```txt
Logo
Discover
Categories
Sell
Messages
Profile
```

## 6. Search Component

### Mobile

```jsx
<SearchBar />
```

```css
width: 100%;
height: 48px;
position: sticky;
top: 0;
```

### Desktop

Desktop에서는 검색에 필터를 함께 배치한다.

```txt
<SearchBar />
+ <CategoryFilter />
+ <LocationFilter />
+ <PriceFilter />
```

구조:

```css
display: flex;
flex-direction: row;
```

## 7. Marketplace Feed

### Mobile

```jsx
<ProductGrid columns={1} />
```

```css
flex-direction: column;
```

### Tablet

```txt
columns = 2
```

### Desktop

```txt
columns = 3~4
```

React 예:

```jsx
<ProductGrid
  columns={{
    mobile: 1,
    tablet: 2,
    desktop: 4,
  }}
/>
```

## 8. Item Detail Responsive

### Mobile

Priority 순서:

```txt
Image
Price
Title
Chat CTA
Seller
Description
Reviews
```

Sticky CTA:

```jsx
<ChatButton />
```

위치는 bottom fixed.

### Desktop

Two column layout:

```txt
<ItemGallery /> | <ItemInfo />
```

```css
display: grid;
grid-template-columns: 2fr 1fr;
```

## 9. Create Listing Responsive

TADA 핵심 UX.

### Mobile

```jsx
<CreateListingWizard />
```

Flow:

```txt
Step 1: Photo
Step 2: AI Title
Step 3: Price
Step 4: Location
Publish
```

### Desktop

```txt
<ListingForm /> + <Preview />
```

```css
grid-template-columns: 60% 40%;
```

## 10. Dashboard Responsive

### Mobile

```jsx
<DashboardCards />
```

Cards:

```txt
Charge
Listings
Messages
Views
```

### Desktop

```jsx
<DashboardAnalytics />
```

구성:

```txt
Stats
Chart
Listings Table
Reviews
```

## 11. Responsive Modal System

### Mobile

```jsx
<BottomSheet />
```

사용:

- Filter
- Category
- Offer

Animation:

```txt
slide-up
```

### Desktop

```jsx
<Modal />
```

사용:

```txt
center popup
```

## 12. Touch & Interaction Rules

Mobile touch target:

```txt
minimum: 44x44px
```

Button height:

```txt
48-52px
```

Desktop interaction:

```txt
Hover
Tooltip
Preview
Quick Actions
```

## 13. React Folder Structure

Responsive 기준 component 구조:

```txt
src
/components
  common
    Button
    Modal
    Input
  marketplace
    ProductCard
    ProductGrid
    Filter
  listing
    CreateForm
    ImageUploader
  chat
    ChatWindow
  dashboard
    StatsCard
    Analytics
```

## 14. TADA React Responsive Summary

| Component | Mobile | Desktop |
| --- | --- | --- |
| Navigation | Bottom Nav | Top Nav |
| Product Card | Compact | Expanded |
| Feed | 1 Column | 3-4 Column |
| Search | Full Width | Advanced Filter |
| Detail | Vertical | 2 Column |
| Listing | Wizard | Form + Preview |
| Chat | Full Screen | Panel |
| Dashboard | Cards | Analytics |
| Modal | Bottom Sheet | Center Modal |
| Filter | Drawer | Sidebar |

## Final Principle

Mobile first. One component. Responsive layout.
