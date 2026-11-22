import fs from 'node:fs';
import path from 'node:path';
import { validateContentSnapshot } from '../src/lib/adminValidation';
import { loadAllPacks, loadLibrary } from '../src/lib/content';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

function main() {
  const library = loadLibrary();
  const packs = loadAllPacks();

  const snapshot = {
    packs,
    props: Object.values(library.props),
    backdrops: Object.values(library.backdrops),
    poses: Object.values(library.poses),
    moods: Object.values(library.moods),
  };

  const report = validateContentSnapshot(snapshot, (assetUrl) => {
    const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl;
    return fs.existsSync(path.join(PUBLIC_DIR, normalized));
  });

  for (const warn of report.warnings) {
    console.warn(`WARN: ${warn}`);
  }
  if (report.errors.length > 0) {
    for (const err of report.errors) {
      console.error(`FAIL: ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `OK: Validated ${snapshot.packs.length} pack(s), ${snapshot.props.length} props, ${snapshot.backdrops.length} backdrops, ${snapshot.poses.length} poses, ${snapshot.moods.length} moods.`
  );
}

main();
