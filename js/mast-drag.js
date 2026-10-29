(() => {
  const app = window.SignalMaker;

  // Drop coordinates are in the complete preview scene, including mirrored
  // supports, scene padding, and the active assembly's approach offset.
  function mastDropTarget(project, layout, entity, kind, x, y) {
    if (!app.hasMast(project) || !entity || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const mast = layout.mast;
    const offset = layout.supportOffset ?? { x: 0, y: 0 };
    const mirrored = project.support.side === 'left';
    const screenX = raw => (mirrored ? mast.width - raw : raw) + offset.x;
    const poleX = screenX(mast.poleX);
    const baseY = app.dimensions.mast.poleHeight + mast.offsetY + offset.y;
    const rawX = mirrored ? mast.width - (x - offset.x) : x - offset.x;
    const position = Math.max(0, Math.min(project.support.length,
      app.supportPositionAtX(project.support, rawX - mast.armX)));
    const arm = mast.armAt(position);
    const armY = arm.y + mast.offsetY + offset.y;
    const items = kind === 'head' ? layout.heads : layout.streetSigns;
    const item = items.find(item => (item.head ?? item.sign).id === entity.id);
    if (!item) return null;
    const wasPole = kind === 'head' ? Boolean(entity.poleMounted) : entity.mounting === 'mast';
    const poleHit = Math.abs(x - poleX) <= Math.max(12, mast.poleDiameter / 2 + 8)
      && y >= mast.offsetY + offset.y - 8 && y <= baseY + 8;
    const armHit = rawX >= mast.armX - 8 && rawX <= mast.tip.x + 12
      && Math.abs(y - armY) <= Math.max(18, item.geometry.height / 2 + 20);
    let pole = wasPole;
    if (!wasPole && poleHit) pole = true;
    // A vertical move beside a pole must not turn a bracket-mounted head into
    // an arm-mounted head when it passes the arm's height.
    else if (wasPole && !poleHit && armHit && Math.abs(x - item.x - item.geometry.width / 2) >= 12) pole = false;
    return { pole, position: pole ? baseY - y : position };
  }

  function dropMastElement(project, layout, entity, kind, x, y) {
    const target = mastDropTarget(project, layout, entity, kind, x, y);
    if (!target) return false;
    if (kind === 'head') {
      if (target.pole && !entity.poleMounted) entity.poleMounting = 'direct';
      entity.poleMounted = target.pole;
      app.setArmPosition(entity, project.support, Math.round(target.position / 3) * 3);
    } else {
      if (target.pole && entity.mounting !== 'mast') {
        entity.armMounting = entity.mounting;
        entity.mounting = 'mast';
      } else if (!target.pole && entity.mounting === 'mast') {
        entity.mounting = entity.armMounting ?? 'direct';
      }
      app.setStreetSignPosition(entity, project.support, target.position);
    }
    return true;
  }

  Object.assign(app, { mastDropTarget, dropMastElement });
})();
