import React from 'react';
import Collapsible from './Collapsible';
import ImageSheet from './ImageSheet';
import LinkList from './LinkList';
import widgets from '../widgets';

// Renders one section from a content file. The body comes from whichever key it has:
// images, links, children or widget.
function Section({ section }) {
  return (
    <Collapsible {...section}>
      <SectionBody section={section} />
    </Collapsible>
  );
}

function SectionBody({ section }) {
  if (section.images) return <ImageSheet images={section.images} title={section.title} />;
  if (section.links) return <LinkList groups={section.links} />;
  if (section.children) return section.children.map((child) => <Section key={child.id} section={child} />);
  if (section.widget) {
    const Widget = widgets[section.widget];
    if (!Widget) return <p className="error">Unknown widget "{section.widget}"</p>;
    return <Widget sectionId={section.id} {...section.props} />;
  }
  return null;
}

export default Section;
