#!/usr/bin/env node

const fs = require("fs");
const cp = require("child_process");
const fsExtra = require("fs-extra");
const detectIndent = require("detect-indent");
const _ = require("lodash");
const p = require("path");
const program = require("commander");
const inquirer = require("inquirer");
const packageJsonPath = p.resolve(process.cwd(), "package.json");
const ora = require("ora");
const spinner = ora();

// const git = (args) => cp.spawnSync("git", args, { stdio: "inherit" });
// console.log("当前工作目录: ", process.cwd());
// console.log("当前模块文件目录: ", __dirname);
// cp.spawnSync('git', ['config','core.hooksPath','.husky'], { stdio: 'inherit',cwd:p.resolve(__dirname,"../") })
program.version(require("../package.json").version);
program
  .command("init")
  .description("create lint")
  .action((name) => {
    // console.log(name);
  });
program.parse(process.argv);

const question = [
  // {
  //   type: "confirm",
  //   name: "eslint",
  //   message: "是否需要eslint",
  //   default: true,
  // },
  {
    type: "confirm",
    name: "commit",
    message: "是否需要检测commit信息",
    default: true,
  },
  {
    type: "list",
    name: "install",
    message: "安装方式",
    choices: [
      {
        name: "npm",
        checked: true, // 默认选中
      },
      {
        name: "yarn",
      },
      {
        name: "cnpm",
      },
    ],
  },
];

const install = function (res) {
  const { eslint, commit, install } = res;
  const packages = {
    eslint: ["eslint", "eslint-plugin-vue"],
    standard: [
      "eslint-config-standard",
      "eslint-plugin-promise",
      "eslint-plugin-import",
      "eslint-plugin-node",
      "prettier",
      "eslint-config-prettier",
      "lint-staged",
      "husky",
    ],
    commit: [
      "@commitlint/config-conventional",
      "@commitlint/cli",
      "commitizen",
    ],
  };

  let arr = [
    ...packages.eslint,
    ...packages.standard,
    ...(commit ? packages.commit : []),
  ];
  var cp1 = cp.spawn(install, [
    install === "yarn" ? "add" : "install",
    ...arr,
    install === "yarn" ? "-D" : "--save-dev",
  ],{
    shell:true
  });
  spinner.start();
  cp1.stdout.on("data", function (buf) {
    console.log(buf.toString());
  });
  cp1.on("close", function (code) {
    // console.log("子进程已退出，退出码 " + code);
    spinner.stop();

    addEslint();
    addEditorConfig();
    addLintStaged();
    editGitHookPath();
    addPreCommitHook();
    if (commit) {
      addCommitMsgHook();
    }
  });
};
inquirer.prompt(question).then((res) => {
  // console.log(res);
  install(res);
});
const addEslint = function () {
  let eslintPath = p.resolve(process.cwd(), ".eslintrc.js");
  fs.stat(eslintPath, function (error, stats) {
    if (error) {
      fsExtra.copy(
        p.resolve(__dirname, "../.eslintrc.js"),
        process.cwd() + "/.eslintrc.js",
        function (error) {
          if (error) return console.error(error);
        }
      );
    } else {
      const eslintContent = require(eslintPath);
      let newExtends = eslintContent.extends;

      ["standard","prettier"].forEach(function (item) {
        if (newExtends.indexOf(item) <= -1) {
          newExtends.push(item);
        }
      });
      let newEslintContentContent = _.merge(eslintContent, {
        extends: newExtends,
      });
      const indent = detectIndent(JSON.stringify(newEslintContentContent)).indent || "  ";
      let str = `module.exports = ` + JSON.stringify(newEslintContentContent,null, indent);
      fs.writeFileSync(eslintPath, str + "\n");
    }
  });
};
const addEditorConfig=function(){
  fsExtra.copy(
    p.resolve(__dirname, "../.editorconfig"),
    process.cwd() + "/.editorconfig",
    function (error) {
      if (error) return console.error(error);
    }
  );
}
const editGitHookPath = function () {
  cp.spawn("git", ["config", "core.hooksPath", ".husky"], {
    // stdio: "inherit",
  });
};
const addFile = function () {
  const dir = ".husky";
  fsExtra.copy(
    p.resolve(__dirname, "../.husky"),
    process.cwd() + "/.husky",
    function (error) {
      if (error) return console.error(error);
    }
  );
};
const addPreCommitHook = function () {
  fsExtra.copy(
    p.resolve(__dirname, "../.husky/_"),
    process.cwd() + "/.husky/_",
    function (error) {
      if (error) return console.error(error);
    }
  );
  fsExtra.copy(
    p.resolve(__dirname, "../.husky/pre-commit"),
    process.cwd() + "/.husky/pre-commit",
    function (error) {
      if (error) return console.error(error);
    }
  );
};
const addCommitMsgHook = function () {
  fsExtra.copy(
    p.resolve(__dirname, "../commitlint.config.js"),
    process.cwd() + "/commitlint.config.js",
    function (error) {
      if (error) return console.error(error);
    }
  );
  const adapterNpmName = `cz-conventional-changelog`;
  const commitizenAdapterConfig = {
    config: {
      commitizen: {
        path: `./node_modules/${adapterNpmName}`,
      },
    },
  };
  const packageJsonString = fs.readFileSync(packageJsonPath, "utf-8");
  const indent = detectIndent(packageJsonString).indent || "  ";
  const packageJsonContent = JSON.parse(packageJsonString);
  let newPackageJsonContent = "";
  if (_.get(packageJsonContent, "config.commitizen.path") !== adapterNpmName) {
    // 插入commitizen配置
    newPackageJsonContent = _.merge(
      packageJsonContent,
      commitizenAdapterConfig
    );
  }
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(newPackageJsonContent, null, indent) + "\n"
  );

  fsExtra.copy(
    p.resolve(__dirname, "../.husky/commit-msg"),
    process.cwd() + "/.husky/commit-msg",
    function (error) {
      if (error) return console.error(error);
    }
  );
};
const addLintStaged = function () {
  const lintStaged = {
    "lint-staged": {
      "src/**/*.{js,vue,ts}": ["prettier --write", "eslint --fix"],
    },
  };
  // package.json
  const packageJsonString = fs.readFileSync(packageJsonPath, "utf-8");
  const indent = detectIndent(packageJsonString).indent || "  ";
  const packageJsonContent = JSON.parse(packageJsonString);
  let newPackageJsonContent = _.merge(packageJsonContent, lintStaged);
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(newPackageJsonContent, null, indent) + "\n"
  );
};
