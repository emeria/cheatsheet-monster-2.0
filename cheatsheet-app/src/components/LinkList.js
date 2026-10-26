import React, { Fragment } from 'react';
import ExternalLink from './ExternalLink';

// Groups of links. An item renders as: text <label link> — note (extra | extra)
function LinkList({ groups }) {
  return (
    <div className="link-groups">
      {groups.map((group) => {
        const List = group.ordered ? 'ol' : 'ul';
        return (
          <div className="link-group" key={group.heading}>
            <h3>{group.heading}</h3>
            {group.intro && <p>{group.intro}</p>}
            <List>
              {group.items.map((item, i) => (
                <li key={i}>
                  <LinkItem {...item} />
                </li>
              ))}
            </List>
          </div>
        );
      })}
    </div>
  );
}

function LinkItem({ text, label, url, note, extras }) {
  return (
    <>
      {text}
      {text && label && ' '}
      {label && (url ? <ExternalLink href={url}>{label}</ExternalLink> : label)}
      {note && <span className="note"> — {note}</span>}
      {extras && (
        <>
          {' ('}
          {extras.map((extra, i) => (
            <Fragment key={extra.url}>
              {i > 0 && ' | '}
              <ExternalLink href={extra.url}>{extra.label}</ExternalLink>
            </Fragment>
          ))}
          {')'}
        </>
      )}
    </>
  );
}

export default LinkList;
