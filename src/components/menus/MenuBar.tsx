import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MenuItemDef {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  submenu?: MenuItemDef[];
  checked?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

/* ------------------------------------------------------------------ */
/*  Helper: fire a namespaced CustomEvent on window                    */
/* ------------------------------------------------------------------ */

const dispatch = (name: string, detail?: unknown) => {
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const MenuBar: React.FC = () => {
  const store = useEditorStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  /* --- Click-outside closes the bar -------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* --- Menu definitions -------------------------------------------- */

  const menus: MenuDef[] = [
    /* FILE */
    {
      label: 'File',
      items: [
        {
          label: 'New',
          shortcut: 'Ctrl+N',
          action: () => dispatch('photoslop:new'),
        },
        {
          label: 'Open',
          shortcut: 'Ctrl+O',
          action: () => dispatch('photoslop:open'),
        },
        {
          label: 'Save',
          shortcut: 'Ctrl+S',
          action: () => dispatch('photoslop:save'),
        },
        {
          label: 'Export As PNG',
          action: () => dispatch('photoslop:export', { format: 'png' }),
        },
        {
          label: 'Export As JPEG',
          action: () => dispatch('photoslop:export', { format: 'jpeg' }),
        },
        {
          label: 'Export As WebP',
          action: () => dispatch('photoslop:export', { format: 'webp' }),
        },
        { label: '', separator: true },
        {
          label: 'Close',
          action: () => dispatch('photoslop:close'),
        },
      ],
    },

    /* EDIT */
    {
      label: 'Edit',
      items: [
        {
          label: 'Undo',
          shortcut: 'Ctrl+Z',
          action: () => store.undo(),
        },
        {
          label: 'Redo',
          shortcut: 'Ctrl+Shift+Z',
          action: () => store.redo(),
        },
        { label: '', separator: true },
        {
          label: 'Cut',
          shortcut: 'Ctrl+X',
          action: () => dispatch('photoslop:cut'),
        },
        {
          label: 'Copy',
          shortcut: 'Ctrl+C',
          action: () => dispatch('photoslop:copy'),
        },
        {
          label: 'Paste',
          shortcut: 'Ctrl+V',
          action: () => dispatch('photoslop:paste'),
        },
        { label: '', separator: true },
        {
          label: 'Select All',
          shortcut: 'Ctrl+A',
          action: () => dispatch('photoslop:selectAll'),
        },
        {
          label: 'Deselect',
          shortcut: 'Ctrl+D',
          action: () => store.clearSelection(),
        },
      ],
    },

    /* IMAGE */
    {
      label: 'Image',
      items: [
        {
          label: 'Canvas Size',
          action: () => dispatch('photoslop:canvasSize'),
        },
        {
          label: 'Image Size',
          action: () => dispatch('photoslop:imageSize'),
        },
        { label: '', separator: true },
        {
          label: 'Flip Horizontal',
          action: () => dispatch('photoslop:flip', { direction: 'horizontal' }),
        },
        {
          label: 'Flip Vertical',
          action: () => dispatch('photoslop:flip', { direction: 'vertical' }),
        },
        { label: '', separator: true },
        {
          label: 'Rotate 90\u00B0 CW',
          action: () => dispatch('photoslop:rotate', { angle: 90 }),
        },
        {
          label: 'Rotate 90\u00B0 CCW',
          action: () => dispatch('photoslop:rotate', { angle: -90 }),
        },
        {
          label: 'Rotate 180\u00B0',
          action: () => dispatch('photoslop:rotate', { angle: 180 }),
        },
      ],
    },

    /* LAYER */
    {
      label: 'Layer',
      items: [
        {
          label: 'New Layer',
          shortcut: 'Ctrl+Shift+N',
          action: () => store.addLayer(),
        },
        {
          label: 'Duplicate Layer',
          action: () => {
            const id = store.activeLayerId;
            if (id) store.duplicateLayer(id);
          },
        },
        {
          label: 'Delete Layer',
          action: () => {
            const id = store.activeLayerId;
            if (id) store.removeLayer(id);
          },
        },
        { label: '', separator: true },
        {
          label: 'Merge Down',
          action: () => dispatch('photoslop:mergeDown'),
        },
        {
          label: 'Flatten Image',
          action: () => store.flattenLayers(),
        },
        { label: '', separator: true },
        {
          label: 'New Adjustment Layer',
          submenu: [
            {
              label: 'Brightness/Contrast',
              action: () =>
                dispatch('photoslop:newAdjustmentLayer', { type: 'brightness-contrast' }),
            },
            {
              label: 'Hue/Saturation',
              action: () =>
                dispatch('photoslop:newAdjustmentLayer', { type: 'hue-saturation' }),
            },
            {
              label: 'Levels',
              action: () =>
                dispatch('photoslop:newAdjustmentLayer', { type: 'levels' }),
            },
            {
              label: 'Curves',
              action: () =>
                dispatch('photoslop:newAdjustmentLayer', { type: 'curves' }),
            },
          ],
        },
      ],
    },

    /* FILTER */
    {
      label: 'Filter',
      items: [
        {
          label: 'Blur',
          submenu: [
            {
              label: 'Gaussian',
              action: () => dispatch('photoslop:filter', { filter: 'gaussian-blur' }),
            },
            {
              label: 'Motion',
              action: () => dispatch('photoslop:filter', { filter: 'motion-blur' }),
            },
            {
              label: 'Radial',
              action: () => dispatch('photoslop:filter', { filter: 'radial-blur' }),
            },
          ],
        },
        {
          label: 'Sharpen',
          submenu: [
            {
              label: 'Sharpen',
              action: () => dispatch('photoslop:filter', { filter: 'sharpen' }),
            },
            {
              label: 'Unsharp Mask',
              action: () => dispatch('photoslop:filter', { filter: 'unsharp-mask' }),
            },
          ],
        },
        {
          label: 'Noise',
          submenu: [
            {
              label: 'Add Noise',
              action: () => dispatch('photoslop:filter', { filter: 'add-noise' }),
            },
            {
              label: 'Reduce Noise',
              action: () => dispatch('photoslop:filter', { filter: 'reduce-noise' }),
            },
          ],
        },
        {
          label: 'Distort',
          submenu: [
            {
              label: 'Lens Distortion',
              action: () => dispatch('photoslop:filter', { filter: 'lens-distortion' }),
            },
          ],
        },
        {
          label: 'Other',
          submenu: [
            {
              label: 'Vignette',
              action: () => dispatch('photoslop:filter', { filter: 'vignette' }),
            },
            {
              label: 'Pixelate',
              action: () => dispatch('photoslop:filter', { filter: 'pixelate' }),
            },
            {
              label: 'Posterize',
              action: () => dispatch('photoslop:filter', { filter: 'posterize' }),
            },
            {
              label: 'Emboss',
              action: () => dispatch('photoslop:filter', { filter: 'emboss' }),
            },
          ],
        },
      ],
    },

    /* VIEW */
    {
      label: 'View',
      items: [
        {
          label: 'Zoom In',
          shortcut: 'Ctrl+=',
          action: () =>
            store.setDocument({ zoom: Math.min((store.document.zoom ?? 1) * 1.25, 32) }),
        },
        {
          label: 'Zoom Out',
          shortcut: 'Ctrl+-',
          action: () =>
            store.setDocument({ zoom: Math.max((store.document.zoom ?? 1) / 1.25, 0.01) }),
        },
        {
          label: 'Fit to Screen',
          shortcut: 'Ctrl+0',
          action: () => dispatch('photoslop:fitToScreen'),
        },
        { label: '', separator: true },
        {
          label: 'Rulers',
          action: () => store.toggleRulers(),
          checked: store.showRulers,
        },
        {
          label: 'Grid',
          action: () => store.toggleGrid(),
          checked: store.showGrid,
        },
        {
          label: 'Guides',
          action: () => store.toggleGuides(),
          checked: store.showGuides,
        },
        {
          label: 'Snap to Grid',
          action: () => store.toggleSnap(),
          checked: store.snapToGrid,
        },
      ],
    },

    /* HELP */
    {
      label: 'Help',
      items: [
        {
          label: 'About Photoslop',
          action: () => dispatch('photoslop:about'),
        },
      ],
    },
  ];

  /* --- Interaction handlers ---------------------------------------- */

  const handleMenuClick = useCallback(
    (label: string) => {
      setOpenMenu((prev) => (prev === label ? null : label));
    },
    [],
  );

  const handleMenuHover = useCallback(
    (label: string) => {
      // Only switch if a menu is already open (hover-to-switch behaviour)
      setOpenMenu((prev) => (prev !== null ? label : prev));
    },
    [],
  );

  const handleItemClick = useCallback(
    (item: MenuItemDef) => {
      if (item.separator || item.submenu) return;
      item.action?.();
      setOpenMenu(null);
    },
    [],
  );

  /* --- Sub-menu renderer ------------------------------------------- */

  const renderSubmenu = (items: MenuItemDef[]) => (
    <div className="menubar-dropdown menubar-submenu">
      {items.map((sub, idx) => (
        <div
          key={idx}
          className="menubar-dropdown-item"
          onClick={(e) => {
            e.stopPropagation();
            handleItemClick(sub);
          }}
        >
          <span>{sub.label}</span>
          {sub.shortcut && <span className="menu-shortcut">{sub.shortcut}</span>}
        </div>
      ))}
    </div>
  );

  /* --- Dropdown renderer ------------------------------------------- */

  const renderDropdown = (menu: MenuDef) => (
    <div className="menubar-dropdown">
      {menu.items.map((item, idx) => {
        if (item.separator) {
          return <div key={idx} className="menubar-dropdown-separator" />;
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0;

        return (
          <div
            key={idx}
            className={`menubar-dropdown-item${hasSubmenu ? ' has-submenu' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasSubmenu) handleItemClick(item);
            }}
          >
            {item.checked !== undefined && (
              <span className="menu-check">{item.checked ? '\u2713' : ''}</span>
            )}
            <span>{item.label}</span>
            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
            {hasSubmenu && <span className="submenu-arrow">{'\u25B6'}</span>}
            {hasSubmenu && renderSubmenu(item.submenu!)}
          </div>
        );
      })}
    </div>
  );

  /* --- Render ------------------------------------------------------ */

  return (
    <div className="menubar" ref={menuBarRef}>
      {menus.map((menu) => (
        <div
          key={menu.label}
          className={`menubar-item${openMenu === menu.label ? ' active' : ''}`}
          onClick={() => handleMenuClick(menu.label)}
          onMouseEnter={() => handleMenuHover(menu.label)}
        >
          {menu.label}
          {openMenu === menu.label && renderDropdown(menu)}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;
