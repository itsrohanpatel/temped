/**
 * TempEd Pro - WYSIWYG Engine Subsystem
 * Manages contenteditable canvas, TreeWalker cursor restoration, link styling, and two-way sync.
 */
(function(window) {
    'use strict';

    const WysiwygEngine = {
        saveSelection(containerEl) {
            if (!containerEl) return null;
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return null;
            const range = selection.getRangeAt(0);
            if (!containerEl.contains(range.commonAncestorContainer)) return null;

            let charCount = 0;
            let start = 0;
            let end = 0;
            let foundStart = false;
            let foundEnd = false;

            const walker = document.createTreeWalker(
                containerEl,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: (node) => {
                        if (node.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
                        if (node.nodeName === 'BR') return NodeFilter.FILTER_ACCEPT;
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );

            let currentNode = walker.nextNode();
            while (currentNode) {
                if (currentNode === range.startContainer) {
                    start = charCount + range.startOffset;
                    foundStart = true;
                } else if (currentNode.nodeType === 1 && currentNode === range.startContainer.childNodes[range.startOffset]) {
                    start = charCount;
                    foundStart = true;
                }

                if (currentNode === range.endContainer) {
                    end = charCount + range.endOffset;
                    foundEnd = true;
                } else if (currentNode.nodeType === 1 && currentNode === range.endContainer.childNodes[range.endOffset]) {
                    end = charCount;
                    foundEnd = true;
                }

                if (currentNode.nodeType === 3) {
                    charCount += currentNode.nodeValue.length;
                } else if (currentNode.nodeName === 'BR') {
                    charCount += 1;
                }

                if (foundStart && foundEnd) break;
                currentNode = walker.nextNode();
            }

            if (!foundStart) {
                const preSelectionRange = range.cloneRange();
                preSelectionRange.selectNodeContents(containerEl);
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                start = preSelectionRange.toString().length;
                end = start + range.toString().length;
            }

            return { start, end };
        },

        restoreSelection(containerEl, savedSel) {
            if (!containerEl || !savedSel || typeof savedSel.start !== 'number') return;
            let charIndex = 0;
            const range = document.createRange();
            let foundStart = false;
            let foundEnd = false;
            let lastNode = containerEl;

            const walker = document.createTreeWalker(
                containerEl,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: (node) => {
                        if (node.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
                        if (node.nodeName === 'BR') return NodeFilter.FILTER_ACCEPT;
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );

            let currentNode = walker.nextNode();
            while (currentNode) {
                lastNode = currentNode;
                const len = currentNode.nodeType === 3 ? currentNode.nodeValue.length : 1;
                const nextCharIndex = charIndex + len;

                if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                    if (currentNode.nodeType === 3) {
                        range.setStart(currentNode, Math.min(savedSel.start - charIndex, currentNode.nodeValue.length));
                    } else {
                        range.setStartBefore(currentNode);
                    }
                    foundStart = true;
                }

                if (!foundEnd && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                    if (currentNode.nodeType === 3) {
                        range.setEnd(currentNode, Math.min(savedSel.end - charIndex, currentNode.nodeValue.length));
                    } else {
                        range.setEndAfter(currentNode);
                    }
                    foundEnd = true;
                    break;
                }

                charIndex = nextCharIndex;
                currentNode = walker.nextNode();
            }

            // Safety fallback: if target position was beyond content, place at end — NEVER at 0 (top)!
            if (!foundStart) {
                if (lastNode && lastNode !== containerEl) {
                    if (lastNode.nodeType === 3) {
                        range.setStart(lastNode, lastNode.nodeValue.length);
                        range.setEnd(lastNode, lastNode.nodeValue.length);
                    } else {
                        range.setStartAfter(lastNode);
                        range.setEndAfter(lastNode);
                    }
                } else {
                    range.selectNodeContents(containerEl);
                    range.collapse(false);
                }
            } else if (!foundEnd) {
                range.collapse(true);
            }

            try {
                const sel = window.getSelection();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } catch (e) {
                console.warn('Could not restore selection:', e);
            }
        },

        styleAllLinks(containerEl) {
            if (!containerEl) return;
            const links = containerEl.querySelectorAll('a');
            links.forEach(link => {
                link.style.color = '#0400ff';
                link.style.textDecoration = 'underline';
                if (link.innerHTML && !link.querySelector('font[color="#0400ff"]')) {
                    const text = link.textContent;
                    link.innerHTML = `<font color="#0400ff"><u>${text}</u></font>`;
                }
            });
        },

        updateSourceFromPreview(previewEl, htmlInputEl) {
            if (!previewEl || !htmlInputEl) return false;
            const tempDiv = previewEl.cloneNode(true);

            tempDiv.querySelectorAll('span[data-variable]').forEach(span => {
                const name = span.getAttribute('data-variable');
                span.replaceWith(`{{${name}}}`);
            });
            tempDiv.querySelectorAll('mark').forEach(mark => {
                mark.replaceWith(mark.textContent);
            });

            const newHtml = tempDiv.innerHTML;
            if (htmlInputEl.value !== newHtml) {
                htmlInputEl.value = newHtml;
                return true;
            }
            return false;
        },

        highlightSpamInPreview(containerEl, keywords) {
            if (!containerEl || !keywords) return;
            this.clearSpamMarks(containerEl);

            const textNodes = [];
            const walker = document.createTreeWalker(
                containerEl,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;
                        const tag = parent.tagName;
                        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            let node;
            while ((node = walker.nextNode())) textNodes.push(node);

            textNodes.forEach(textNode => {
                const text = textNode.nodeValue;
                const ranges = [];
                keywords.forEach(k => {
                    if (!(k.highlight instanceof RegExp)) return;
                    const flags = k.highlight.flags.includes('g') ? k.highlight.flags : (k.highlight.flags + 'g');
                    const r = new RegExp(k.highlight.source, flags);
                    r.lastIndex = 0;
                    let m;
                    while ((m = r.exec(text)) !== null) {
                        ranges.push({ start: m.index, end: m.index + m[0].length, category: k.category, keyword: k.keyword });
                        if (!r.global) break;
                        if (m.index === r.lastIndex) r.lastIndex++;
                    }
                });
                if (ranges.length === 0) return;

                ranges.sort((a, b) => (a.start - b.start) || (b.end - a.end));
                const nonOverlapping = [];
                let lastEnd = -1;
                for (const rg of ranges) {
                    if (rg.start >= lastEnd) {
                        nonOverlapping.push(rg);
                        lastEnd = rg.end;
                    }
                }

                const frag = document.createDocumentFragment();
                let idx = 0;
                nonOverlapping.forEach(rg => {
                    if (rg.start > idx) frag.appendChild(document.createTextNode(text.slice(idx, rg.start)));
                    const mark = document.createElement('mark');
                    mark.className = `spam-category-${rg.category}`;
                    mark.setAttribute('data-spam-keyword', rg.keyword);
                    mark.setAttribute('title', `${rg.keyword} (${rg.category})`);
                    mark.textContent = text.slice(rg.start, rg.end);
                    frag.appendChild(mark);
                    idx = rg.end;
                });
                if (idx < text.length) frag.appendChild(document.createTextNode(text.slice(idx)));
                textNode.parentNode.replaceChild(frag, textNode);
            });
        },

        clearSpamMarks(containerEl) {
            if (!containerEl) return;
            containerEl.querySelectorAll('mark').forEach(mark => {
                const text = document.createTextNode(mark.textContent || '');
                mark.replaceWith(text);
            });
        },

        applyCommand(command, value = null) {
            try {
                document.execCommand(command, false, value);
            } catch (e) {
                console.warn('Command failed:', command, e);
            }
        }
    };

    window.WysiwygEngine = WysiwygEngine;
})(typeof window !== 'undefined' ? window : global);
