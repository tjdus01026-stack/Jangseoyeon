const Engine = Matter.Engine;
const Render = Matter.Render;
const Runner = Matter.Runner;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;
const Constraint = Matter.Constraint;
const Events = Matter.Events;

const W = window.innerWidth;
const H = window.innerHeight;

const UNIT = Math.min(W, H) / 18;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";

document.body.style.background = `
radial-gradient(
    circle at 18% 16%,
    rgba(112, 88, 194, 0.35),
    transparent 24%
),
radial-gradient(
    circle at 82% 12%,
    rgba(64, 112, 210, 0.25),
    transparent 22%
),
radial-gradient(
    circle at 50% 72%,
    rgba(43, 67, 139, 0.20),
    transparent 36%
),
linear-gradient(
    180deg,
    #040611 0%,
    #090f23 30%,
    #111938 65%,
    #1b214e 100%
)
`;

const engine = Engine.create();
const world = engine.world;

engine.gravity.x = 0;
engine.gravity.y = 1;
engine.gravity.scale = 0.001;

const render = Render.create({
  element: document.body,
  engine: engine,

  options: {
    width: W,
    height: H,
    wireframes: false,
    background: "transparent",
  },
});

Render.run(render);

render.canvas.style.position = "absolute";
render.canvas.style.left = "0";
render.canvas.style.top = "0";
render.canvas.style.width = "100%";
render.canvas.style.height = "100%";
render.canvas.style.background = "transparent";

const runner = Runner.create();

Runner.run(runner, engine);

const centerX = W / 2;
const catapultY = H * 0.9;

const catapultWidth = W * 0.5;
const catapultHeight = UNIT * 0.23;

const CATAPULT_COLOR = "#777777";

const catapultGroup = Body.nextGroup(true);

const catapult = Bodies.rectangle(
  centerX,
  catapultY,

  catapultWidth,
  catapultHeight,

  {
    density: 0.004,

    friction: 0.8,

    restitution: 0.1,

    collisionFilter: {
      group: catapultGroup,
    },

    render: {
      fillStyle: CATAPULT_COLOR,
    },
  },
);

const pivot = Constraint.create({
  bodyA: catapult,

  pointB: {
    x: centerX,
    y: catapultY,
  },

  length: 0,

  stiffness: 1,

  render: {
    visible: false,
  },
});

const support = Bodies.rectangle(
  centerX,

  catapultY + UNIT * 0.75,

  UNIT * 0.28,

  UNIT * 1.5,

  {
    isStatic: true,

    collisionFilter: {
      group: catapultGroup,
    },

    render: {
      fillStyle: CATAPULT_COLOR,
    },
  },
);

const leftSupportX = centerX - catapultWidth * 0.38;

const leftSupport = Bodies.rectangle(
  leftSupportX,

  catapultY + UNIT * 0.55,

  UNIT * 0.23,

  UNIT * 1.0,

  {
    isStatic: true,

    render: {
      fillStyle: CATAPULT_COLOR,
    },
  },
);

const ground = Bodies.rectangle(
  W / 2,

  H + 20,

  W,

  40,

  {
    isStatic: true,

    render: {
      visible: false,
    },
  },
);

const wallThickness = 80;

const leftWall = Bodies.rectangle(
  -wallThickness / 2,

  H / 2,

  wallThickness,

  H,

  {
    isStatic: true,

    render: {
      visible: false,
    },
  },
);

const rightWall = Bodies.rectangle(
  W + wallThickness / 2,

  H / 2,

  wallThickness,

  H,

  {
    isStatic: true,

    render: {
      visible: false,
    },
  },
);

const topWall = Bodies.rectangle(
  W / 2,

  -wallThickness / 2,

  W,

  wallThickness,

  {
    isStatic: true,

    render: {
      visible: false,
    },
  },
);

const starSVG = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    width="100"
    height="100"
    viewBox="0 0 100 100"
>

    <polygon
        points="
        50,3
        61,35
        96,35
        68,56
        79,91
        50,70
        21,91
        32,56
        4,35
        39,35
        "
        fill="#FFD900"
    />

</svg>
`;

const starTexture =
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(starSVG);

const starRadius = UNIT * 0.42;

function createStar(x, y) {
  return Bodies.circle(
    x,
    y,

    starRadius,

    {
      restitution: 0.22,

      friction: 0.75,

      frictionAir: 0.015,

      density: 0.0012,

      render: {
        fillStyle: "transparent",

        sprite: {
          texture: starTexture,

          xScale: (starRadius * 2) / 100,

          yScale: (starRadius * 2) / 100,
        },
      },
    },
  );
}

const stars = [];

const clusterCenterX = centerX - catapultWidth * 0.24;

const bottomY = catapultY - catapultHeight / 2 - starRadius * 0.95;

const rowPattern = [5, 4, 3, 2];

const hSpacing = starRadius * 2.05;

const vSpacing = starRadius * 1.65;

for (let row = 0; row < rowPattern.length; row++) {
  const count = rowPattern[row];

  const rowWidth = (count - 1) * hSpacing;

  const startX = clusterCenterX - rowWidth / 2;

  const y = bottomY - row * vSpacing;

  for (let col = 0; col < count; col++) {
    const x = startX + col * hSpacing;

    const star = createStar(x, y);

    Body.setAngle(
      star,

      row * 0.12 + col * 0.09,
    );

    stars.push(star);
  }
}

const ballRadius = UNIT * 0.45;

const ballX = centerX + catapultWidth * 0.45;

const ball = Bodies.circle(
  ballX,

  H * 0.11,

  ballRadius,

  {
    density: 0.008,

    restitution: 0.08,

    frictionAir: 0,

    render: {
      fillStyle: "#FFD900",
    },
  },
);

Composite.add(
  world,

  [
    catapult,
    pivot,
    support,
    leftSupport,
    ground,
    leftWall,
    rightWall,
    topWall,
    ball,
    ...stars,
  ],
);

let launched = false;
let launchTime = 0;

Events.on(
  engine,

  "collisionStart",

  function (event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      const A = pairs[i].bodyA;

      const B = pairs[i].bodyB;

      const hit =
        (A === ball && B === catapult) || (A === catapult && B === ball);

      if (hit && !launched) {
        launched = true;

        launchTime = engine.timing.timestamp;

        for (let j = 0; j < stars.length; j++) {
          const star = stars[j];

          const t = j / (stars.length - 1);

          const spread = t * 2 - 1;

          const horizontalBoost = spread * 7.2;

          const verticalBoost = -5.0 - Math.abs(spread) * 0.9;

          Body.setVelocity(
            star,

            {
              x: star.velocity.x + horizontalBoost,

              y: star.velocity.y + verticalBoost,
            },
          );

          Body.setAngularVelocity(
            star,

            spread * 0.06,
          );

          star.frictionAir = 0.01;
        }
      }
    }
  },
);

Events.on(
  engine,

  "beforeUpdate",

  function () {
    if (!launched) {
      return;
    }

    const elapsed = engine.timing.timestamp - launchTime;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];

      const gravityCancel = star.mass * engine.gravity.y * engine.gravity.scale;

      Body.applyForce(
        star,

        star.position,

        {
          x: 0,

          y: -gravityCancel,
        },
      );

      const liftDuration = 5200;

      if (elapsed < liftDuration) {
        const progress = elapsed / liftDuration;

        const liftStrength = Math.pow(1 - progress, 1.15) * star.mass * 0.00005;

        Body.applyForce(
          star,

          star.position,

          {
            x: 0,

            y: -liftStrength,
          },
        );
      }

      if (elapsed > 3600) {
        star.frictionAir = 0.04;
      }

      if (elapsed > 5200) {
        star.frictionAir = 0.08;
      }

      if (elapsed > 6200) {
        Body.setVelocity(
          star,

          {
            x: star.velocity.x * 0.965,

            y: star.velocity.y * 0.965,
          },
        );

        Body.setAngularVelocity(
          star,

          star.angularVelocity * 0.95,
        );

        if (
          Math.abs(star.velocity.x) < 0.06 &&
          Math.abs(star.velocity.y) < 0.06
        ) {
          Body.setVelocity(
            star,

            {
              x: 0,
              y: 0,
            },
          );
        }

        if (Math.abs(star.angularVelocity) < 0.006) {
          Body.setAngularVelocity(star, 0);
        }
      }
    }
  },
);
