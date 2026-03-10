export default function SectionTabs({ active, setActive, tabs }) {
  return (
    <div className="section-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`section-tab ${active === tab ? "section-tab-active" : ""}`}
          onClick={() => setActive(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}