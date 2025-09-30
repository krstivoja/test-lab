(function () {
  function parseSvg(svgString) {
    try {
      const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
      const pathMatch = svgString.match(/<path[^>]*d=["']([^"']+)["']/);

      if (!viewBoxMatch || !pathMatch) {
        console.error('Missing viewBox or path element');
        return null;
      }

      const viewBox = viewBoxMatch[1].split(/\s+/).map(Number);
      const [, , width, height] = viewBox;
      const pathData = pathMatch[1];
      const convertedPath = convertPathToNormalized(pathData, width, height);

      return {
        originalPath: pathData,
        convertedPath,
        width,
        height
      };
    } catch (error) {
      console.error('Parse error:', error);
      return null;
    }
  }

  function convertPathToNormalized(path, w, h) {
    if (!path.trim().match(/^[Mm]/)) {
      console.error('Path does not start with moveto command:', path);
      return 'M 0 0';
    }

    return path.replace(/([MLHVCSQTAZ])\s*([^MLHVCSQTAZ]*)/gi, (match, command, coords) => {
      const numbers = coords.match(/[+-]?([0-9]*[.])?[0-9]+/g) || [];
      const converted = numbers.map((num, index) => {
        const value = parseFloat(num);
        const upper = command.toUpperCase();

        if (upper === 'H' || (upper === 'M' && index % 2 === 0) ||
            (upper === 'L' && index % 2 === 0) || (upper === 'C' && index % 2 === 0)) {
          return (value / w).toFixed(4);
        }

        if (upper === 'V' || (upper === 'M' && index % 2 === 1) ||
            (upper === 'L' && index % 2 === 1) || (upper === 'C' && index % 2 === 1)) {
          return (value / h).toFixed(4);
        }

        return num;
      });

      return command + ' ' + converted.join(' ');
    });
  }

  function buildMaskDataUrl(convertedPath) {
    const maskSvg = `<svg xmlns='http://www.w3.org/2000/svg'><defs><mask id='m' maskUnits='objectBoundingBox' maskContentUnits='objectBoundingBox'><path d='${convertedPath}' fill='white'/></mask></defs></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}#m")`;
  }

  function buildCssSnippet() {
    return `.image-container {\n  position: relative;\n  display: inline-block;\n  max-width: 500px;\n  max-height: 500px;\n}\n\n.image-container img {\n  display: block;\n  mask-image: url(#myMask);\n  mask-size: 100% 100%;\n  max-width: 100%;\n}`;
  }

  function buildSvgSnippet(convertedPath) {
    return `<svg width="0" height="0">\n  <defs>\n    <mask id="myMask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">\n      <path d="${convertedPath}" fill="white"/>\n    </mask>\n  </defs>\n</svg>`;
  }

  function updatePreview(state) {
    const { svgInput, imageUrlInput, statusDiv, cssOutput, svgOutput, previewBox } = state;
    const parsed = parseSvg(svgInput.value);

    if (!parsed) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'status error';
      statusDiv.innerHTML = '<strong>✗ Invalid SVG format</strong><div class="status-details">Please paste a valid SVG with a viewBox and path element.</div>';
      cssOutput.textContent = 'Invalid SVG format';
      svgOutput.textContent = 'Invalid SVG format';
      previewBox.innerHTML = '<div style="color: #999;">Invalid SVG format</div>';
      return;
    }

    statusDiv.style.display = 'block';
    statusDiv.className = 'status';
    statusDiv.innerHTML = `<strong>✓ Conversion successful!</strong><div class="status-details">Original dimensions: ${parsed.width} × ${parsed.height} → Normalized to 0-1 range</div>`;

    cssOutput.textContent = buildCssSnippet();
    svgOutput.textContent = buildSvgSnippet(parsed.convertedPath);

    const maskDataUrl = buildMaskDataUrl(parsed.convertedPath);
    previewBox.innerHTML = '<div class="preview-container"><img id="previewImage" src="" alt="Masked preview"></div>';
    const previewImage = document.getElementById('previewImage');
    previewImage.src = imageUrlInput.value;
    previewImage.style.maskImage = maskDataUrl;
    previewImage.style.maskSize = '100% 100%';
  }

  function copyCode(codeOutput) {
    const code = codeOutput.textContent;
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    });
  }

  function init() {
    const svgInput = document.getElementById('svgInput');
    const imageUrlInput = document.getElementById('imageUrl');
    const statusDiv = document.getElementById('status');
    const cssOutput = document.getElementById('cssOutput');
    const svgOutput = document.getElementById('svgOutput');
    const previewBox = document.getElementById('previewBox');
    const copyCssButton = document.getElementById('copyCssButton');
    const copySvgButton = document.getElementById('copySvgButton');

    const state = { svgInput, imageUrlInput, statusDiv, cssOutput, svgOutput, previewBox };
    const debouncedUpdate = () => updatePreview(state);

    svgInput.addEventListener('input', debouncedUpdate);
    imageUrlInput.addEventListener('input', debouncedUpdate);
    copyCssButton.addEventListener('click', () => copyCode(cssOutput));
    copySvgButton.addEventListener('click', () => copyCode(svgOutput));

    debouncedUpdate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
