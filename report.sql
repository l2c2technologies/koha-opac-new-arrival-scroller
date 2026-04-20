-- Koha OPAC New Arrivals Scroller
-- SQL report feeding the homepage scroller widget.
-- Returns the 50 most recently accessioned titles with ISBN, author, and first 650$a subject.
--
-- Copyright (C) L2C2 Technologies
-- Author: Indranil Das Gupta
-- Licensed under the GNU General Public License v3.0 or later.

SELECT 
  b.biblionumber, 
  SUBSTRING_INDEX(m.isbn, ' ', 1) AS isbn, 
  b.title, 
  COALESCE(b.author, 'N/A') AS author, 
  i.dateaccessioned,
  TRIM(BOTH '.,;:/ ' FROM ExtractValue(bm.metadata, '//datafield[@tag="650"][1]/subfield[@code="a"][1]')) AS subject
FROM items i
LEFT JOIN biblioitems m USING (biblioitemnumber)
LEFT JOIN biblio b ON (i.biblionumber = b.biblionumber)
LEFT JOIN biblio_metadata bm ON (b.biblionumber = bm.biblionumber AND bm.format = 'marcxml')
WHERE DATE_SUB(CURDATE(), INTERVAL 765 DAY) <= i.dateaccessioned 
  AND m.isbn IS NOT NULL 
  AND m.isbn != ''
GROUP BY b.biblionumber
HAVING MAX(i.dateaccessioned)
ORDER BY i.dateaccessioned DESC
LIMIT 50
