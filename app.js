const LEVEL_META = {
  province: {
    label: "省直优先",
    range: "省直 / 沈大市直",
    meter: 100,
    badgeClass: "badge-teal",
  },
  city: {
    label: "沈阳/大连市直优先",
    range: "沈大市直 / 沈大区直",
    meter: 74,
    badgeClass: "badge-warm",
  },
  district: {
    label: "沈阳/大连区直优先",
    range: "沈大区直 / 街道及其他地市直",
    meter: 52,
    badgeClass: "badge-gold",
  },
  street: {
    label: "街道及其他地市直优先",
    range: "街道及其他地市直 / 其他地市直",
    meter: 28,
    badgeClass: "badge-gold",
  },
  verify: {
    label: "先核实资格",
    range: "先核实学校池与基础资格",
    meter: 8,
    badgeClass: "badge-danger",
  },
  reject: {
    label: "基本不符合",
    range: "一票否决 / 不建议继续判断层级",
    meter: 0,
    badgeClass: "badge-danger",
  },
};

const DEGREE_LABEL = {
  bachelor: "本科",
  master: "硕士",
  doctor: "博士",
};

const TIER_LABEL = {
  qingbei: "清北",
  main: "38所主池",
  newd1: "新双一流",
  doublenon: "双非",
};

const HIGHLIGHT_LABEL = {
  party: "党员",
  cadre: "学生干部",
  award: "校级奖励",
  military: "入伍经历",
};

const VETO_LABEL = {
  vetoUpgrade: "专升本",
  vetoIndependent: "独立学院",
  vetoPrivate: "民办本科",
  vetoSpring: "春季高考",
};

const form = document.querySelector("#self-test-form");
const demoButton = document.querySelector("#fill-demo");
const generateButton = document.querySelector("#generate-result");

const visibleGroups = {
  master: document.querySelector("#master-tier-group"),
  doctor: document.querySelector("#doctor-tier-group"),
};

const resultNodes = {
  badge: document.querySelector("#result-badge"),
  entryStatus: document.querySelector("#entry-status"),
  summary: document.querySelector("#result-summary"),
  confidence: document.querySelector("#confidence-text"),
  fill: document.querySelector("#tier-meter-fill"),
  primaryLevel: document.querySelector("#primary-level"),
  levelRange: document.querySelector("#level-range"),
  reasonList: document.querySelector("#reason-list"),
  riskList: document.querySelector("#risk-list"),
};

function getValue(name) {
  const checked = form.querySelector(`[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function isChecked(name) {
  const field = form.querySelector(`[name="${name}"]`);
  return Boolean(field?.checked);
}

function listMarkup(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function isFirstBatchTier(tier) {
  return tier === "qingbei" || tier === "main";
}

function getHighestTier(applyLevel, undergradTier, masterTier, doctorTier) {
  if (applyLevel === "bachelor") {
    return undergradTier;
  }
  if (applyLevel === "master") {
    return masterTier;
  }
  return doctorTier;
}

function hasApplicableQingbei(applyLevel, undergradTier, masterTier, doctorTier) {
  if (applyLevel === "bachelor") {
    return undergradTier === "qingbei";
  }
  if (applyLevel === "master") {
    return undergradTier === "qingbei" || masterTier === "qingbei";
  }
  return (
    undergradTier === "qingbei" ||
    masterTier === "qingbei" ||
    doctorTier === "qingbei"
  );
}

function getSchoolRoleLabel(applyLevel) {
  if (applyLevel === "bachelor") {
    return "本科学校";
  }
  if (applyLevel === "master") {
    return "硕士学校";
  }
  return "博士学校";
}

function buildResult(key, confidence, reasons, risks, summary, entryStatus) {
  return {
    key,
    confidence,
    reasons,
    risks:
      risks.length > 0
        ? risks
        : ["这是经验模型，最终仍以当年辽宁选调系统实际显示为准。"],
    summary,
    entryStatus,
  };
}

function getSelectedHighlightLabels(data) {
  return Object.entries(HIGHLIGHT_LABEL)
    .filter(([key]) => data[key])
    .map(([, label]) => label);
}

function getVetoLabels(data) {
  return Object.entries(VETO_LABEL)
    .filter(([key]) => data[key])
    .map(([, label]) => label);
}

function getEntryReason(applyLevel, highestTier) {
  const degreeLabel = DEGREE_LABEL[applyLevel];
  const schoolRole = getSchoolRoleLabel(applyLevel);
  const tierLabel = TIER_LABEL[highestTier];

  return `${degreeLabel}报考按这版模型主要看${schoolRole}；你选择的是${tierLabel}，所以${isFirstBatchTier(highestTier) ? "大概率有资格报考第一批" : "大概率没有资格报考第一批"}。`;
}

function getUndergradReason(undergradTier) {
  if (undergradTier === "qingbei") {
    return "你的本科就是清北，本科背景本身已经属于放宽档。";
  }
  if (undergradTier === "main") {
    return "你的本科在38所主池内，这一档就按我们前面说的“38所主池档”处理。";
  }
  if (undergradTier === "newd1") {
    return "你的本科是新双一流，不等同双非；在层级判断里就按我们前面说的“新双一流档”处理。";
  }
  return "你的本科是双非，这类样本最容易被卡本科层级上限。";
}

function getBaseData() {
  const applyLevel = getValue("applyLevel");
  const undergradTier = getValue("undergradTier");
  const masterTier = getValue("masterTier");
  const doctorTier = getValue("doctorTier");
  const top60 = getValue("top60");
  const party = isChecked("party");
  const cadre = isChecked("cadre");
  const award = isChecked("award");
  const military = isChecked("military");
  const baselineChecked = isChecked("baselineChecked");
  const vetoUpgrade = isChecked("vetoUpgrade");
  const vetoIndependent = isChecked("vetoIndependent");
  const vetoPrivate = isChecked("vetoPrivate");
  const vetoSpring = isChecked("vetoSpring");

  const highestTier = getHighestTier(applyLevel, undergradTier, masterTier, doctorTier);
  const anyQingbei = hasApplicableQingbei(
    applyLevel,
    undergradTier,
    masterTier,
    doctorTier
  );
  const highlightCount = [party, cadre, award, military].filter(Boolean).length;

  return {
    applyLevel,
    undergradTier,
    masterTier,
    doctorTier,
    highestTier,
    top60,
    party,
    cadre,
    award,
    military,
    anyQingbei,
    highlightCount,
    baselineChecked,
    vetoUpgrade,
    vetoIndependent,
    vetoPrivate,
    vetoSpring,
  };
}

function getDoctorBaseScore(data) {
  if (data.highlightCount === 4) {
    return 3;
  }
  if (data.highlightCount === 3) {
    return data.party ? 3 : 2;
  }
  if (data.highlightCount === 2) {
    return data.party ? 2 : 1;
  }
  if (data.highlightCount === 1) {
    return data.party ? 1 : 0;
  }
  return 0;
}

function levelKeyFromScore(score) {
  if (score >= 3) {
    return "province";
  }
  if (score === 2) {
    return "city";
  }
  if (score === 1) {
    return "district";
  }
  return "street";
}

function getDoctorLevelExplanation(score, data) {
  const selected = getSelectedHighlightLabels(data);
  const selectedText = selected.length > 0 ? selected.join("、") : "暂无";

  if (score >= 3) {
    return `博士判断按“党员、学干、校奖、入伍”四项来看。你当前满足的是${selectedText}，已经达到博士样本里的高位组合，所以优先按省直来判断。`;
  }
  if (score === 2) {
    return `博士判断按“党员、学干、校奖、入伍”四项来看。你当前满足的是${selectedText}，这类组合最像沈阳/大连市直档，党员会明显抬高结果。`;
  }
  if (score === 1) {
    return `博士判断按“党员、学干、校奖、入伍”四项来看。你当前满足的是${selectedText}，这更像沈大区直附近的样本。`;
  }
  return `博士判断按“党员、学干、校奖、入伍”四项来看。你当前满足的是${selectedText}，这类组合通常更像街道及其他地市直。`;
}

function evaluateQualification(data) {
  const vetoLabels = getVetoLabels(data);

  if (vetoLabels.length > 0) {
    return buildResult(
      "reject",
      "高",
      [
        `你的本科存在一票否决项：${vetoLabels.join("、")}。`,
        "这类本科来源问题优先级高于清北放宽，也高于博士放宽。",
        "也就是说，即使你是清北路径或博士报考，也仍然按不符合范围优先处理。",
      ],
      ["这类情况通常不是层级高低的问题，而是先被报名范围直接否掉。"],
      `因为你的本科存在${vetoLabels.join("、")}这一类一票否决项，所以按这版规则不再继续判断省直、市直还是区直，优先视为基本不具备报考资格。`,
      "大概率不具备报考资格"
    );
  }

  if (!data.baselineChecked) {
    return buildResult(
      "verify",
      "低",
      [
        "你还没有确认自己满足应届、年龄、培养方式等公告硬条件。",
        "辽宁选调的这些基础条件属于先决条件，在这一步没确认前，层级判断没有真正落点。",
      ],
      ["请先核实官方公告里的应届身份、年龄、培养方式和毕业时间要求。"],
      "先把基础资格核实清楚，再看层级才有意义。",
      "先核实公告硬条件"
    );
  }

  if (!isFirstBatchTier(data.highestTier)) {
    return buildResult(
      "verify",
      "中高",
      [
        getEntryReason(data.applyLevel, data.highestTier),
        getUndergradReason(data.undergradTier),
      ],
      [
        "如果报考对应学历学校不在清北或38所主池里，这一步更像先被资格入口卡住，而不是先谈能报省直还是区直。",
      ],
      `${getEntryReason(data.applyLevel, data.highestTier)} 因为报考对应学历学校不在清北或38所主池里，所以更像先被第一批入口卡住。`,
      "大概率没有资格报考第一批"
    );
  }

  if (data.highlightCount === 0) {
    return buildResult(
      "verify",
      "中",
      [
        getEntryReason(data.applyLevel, data.highestTier),
        "虽然学校入口看起来还在第一批池内，但你目前没有党员、学干、校奖、入伍这四项里的任何一项。",
      ],
      ["四项全无时，系统往往会直接提示条件不符，或者不给后续层级展示。"],
      "学校入口可能没问题，但亮点条件为零时，第一批基础报名资格本身就很不稳。",
      "第一批资格存在明显风险"
    );
  }

  return null;
}

function evaluateDoctor(data) {
  const reasons = [
    getEntryReason(data.applyLevel, data.highestTier),
    getUndergradReason(data.undergradTier),
    "博士按四项来判断：党员、学生干部、校级奖励、入伍经历；其中党员的权重仍明显高于另外三项。",
    `你当前满足的四项是：${getSelectedHighlightLabels(data).join("、")}。`,
  ];
  const risks = [];

  let score = getDoctorBaseScore(data);

  if (data.anyQingbei && score < 3) {
    score += 1;
    reasons.push("你本硕博里至少有一段是清北，清北路径会把博士样本往上抬一档。");
  }

  if (data.undergradTier === "doublenon" && score > 0) {
    score -= 1;
    reasons.push("你的本科是双非，本科背景会把博士样本再往下压一档。");
  } else if (data.undergradTier === "newd1") {
    reasons.push("你的本科是新双一流，不等同双非，但稳定性通常仍弱于38所主池本科。");
  }

  if (data.top60 === "no") {
    risks.push("博士通常不像硕士那样死卡班级/专业成绩前60%，但成绩偏弱仍会降低结果稳定性。");
  }
  if (data.top60 === "unknown") {
    risks.push("班级/专业成绩前60%未确认时，博士结果通常会在相邻层级之间波动一档。");
  }
  if (data.anyQingbei && data.undergradTier === "doublenon") {
    risks.push("你属于“清北放宽”和“双非拖层级”同时存在的对冲样本，波动会比普通博士样本更大。");
  }

  const key = levelKeyFromScore(score);
  return buildResult(
    key,
    key === "province" ? "中高" : key === "city" ? "中高" : "中",
    reasons,
    risks,
    getDoctorLevelExplanation(score, data),
    "大概率有资格报考第一批"
  );
}

function evaluateNonDoctor(data) {
  const reasons = [
    getEntryReason(data.applyLevel, data.highestTier),
    getUndergradReason(data.undergradTier),
    `你当前满足的亮点条件是：${getSelectedHighlightLabels(data).join("、")}。`,
  ];
  const risks = [];
  const applyLabel = DEGREE_LABEL[data.applyLevel];
  const extraCount = [data.cadre, data.award, data.military].filter(Boolean).length;
  const hasAnyExtra = extraCount >= 1;

  if (data.anyQingbei) {
    reasons.push("你本硕博里至少有一段是清北，属于单列放宽档。");
  }

  if (data.top60 === "no") {
    risks.push(`${applyLabel}样本里，班级/专业成绩前60%没过通常会明显压低层级。`);
    return buildResult(
      "street",
      "高",
      [...reasons, "非博士样本里，班级/专业成绩前60%几乎是省直、市直、区直的共同硬门槛。"],
      risks,
      "因为你不在班级/专业成绩前60%，非博士样本通常不会继续往省直、市直或区直判断，结果应先按街道及其他地市直来看。",
      "大概率有资格报考第一批"
    );
  }

  if (data.top60 === "unknown") {
    risks.push("班级/专业成绩前60%还没确认时，这条关键门槛会让结果明显摇摆。");
  }

  if (data.anyQingbei && data.undergradTier === "doublenon") {
    reasons.push("你属于“清北放宽”和“双非拖层级”同时存在的对冲样本，不能直接按普通清北样本看。");
  }

  if (data.undergradTier === "doublenon") {
    return buildResult(
      "street",
      "高",
      [...reasons, "你的本科是双非，按你这版规律，非博士样本通常直接先按街道及其他地市直来判断。"],
      [...risks, "本科双非是最稳定的下沉因素之一。"],
      "因为你本科是双非，按目前这版经验规律，非博士样本通常不会优先往省直、市直或区直看，而是先按街道及其他地市直来判断。",
      "大概率有资格报考第一批"
    );
  }

  if (data.undergradTier === "qingbei") {
    if (data.top60 === "yes" && data.party && hasAnyExtra) {
      return buildResult(
        "province",
        "高",
        [...reasons, "清北本科通常会放宽一项条件；在你已经满足党员、班级/专业成绩前60%和至少一个补位项的情况下，最像省直档。"],
        risks,
        "因为你本科是清北，且满足党员、班级/专业成绩前60%，再加学生干部、校级荣誉、参军入伍中的至少一项，通常会优先按省直来判断。",
        "大概率有资格报考第一批"
      );
    }

    if (data.top60 === "yes" && data.party) {
      return buildResult(
        "city",
        "高",
        [...reasons, "清北本科会放宽补位项，但市直这一层里党员仍然应视作硬门槛。"],
        risks,
        "因为你本科是清北，班级/专业成绩前60%也保住了，且党员这一项还在，所以更像沈阳/大连市直；清北放宽主要体现在对学干、校奖、入伍这些补位项要求更松。",
        "大概率有资格报考第一批"
      );
    }

    if (data.top60 === "yes" && data.highlightCount >= 1) {
      return buildResult(
        "district",
        "中高",
        [...reasons, "清北会放宽一档，但市直仍然把党员看得更重；当前缺党员时，更像区直。"],
        risks,
        "因为你本科是清北，班级/专业成绩前60%也还在，所以不会直接掉到底层；但市直通常仍把党员看作硬门槛，因此当前更像沈大区直。",
        "大概率有资格报考第一批"
      );
    }
  }

  if (data.undergradTier === "main") {
    if (data.top60 === "yes" && data.party && hasAnyExtra) {
      return buildResult(
        "province",
        "中高",
        [...reasons, "38所主池这一档的省直更像是：班级/专业成绩前60% + 党员 + （学生干部/校级荣誉/参军入伍满足其一）；这三项按同权补位处理。"],
        risks,
        "因为你本科在38所主池这一档，同时满足班级/专业成绩前60%、党员，再加学生干部、校级荣誉、参军入伍中的任意一项，所以最像省直档。这三项在这一层按同权补位处理。",
        "大概率有资格报考第一批"
      );
    }

    if (data.top60 === "yes" && data.party) {
      return buildResult(
        "city",
        "中高",
        [...reasons, "38所主池这一档的市直更像是：班级/专业成绩前60% + 党员；学干、校奖、入伍有则更稳，没有也不一定掉层。"],
        risks,
        "因为你本科在38所主池这一档，同时班级/专业成绩前60%和党员都满足，所以更像沈阳/大连市直。学生干部、校级荣誉、参军入伍在这一层主要起补强作用。",
        "大概率有资格报考第一批"
      );
    }

    if (data.top60 === "yes" && data.highlightCount >= 1) {
      return buildResult(
        "district",
        "中高",
        [...reasons, "38所主池这一档的区直更像是：班级/专业成绩前60% + 党员/学干/校奖/入伍四项里满足其一。"],
        risks,
        "因为你本科在38所主池这一档，班级/专业成绩前60%也保住了；虽然还不够稳到市直，但只要党员、学生干部、校级荣誉、参军入伍里有一项，就比较像沈大区直。",
        "大概率有资格报考第一批"
      );
    }
  }

  if (data.undergradTier === "newd1") {
    if (data.anyQingbei && data.top60 === "yes" && data.party && hasAnyExtra) {
      return buildResult(
        "city",
        "中高",
        [...reasons, "你本科在新双一流这一档，但清北路径会放宽一档；在党员、成绩和补位项都在的情况下，可以上看到市直。"],
        risks,
        "因为你本科在新双一流这一档，但又叠加了清北路径放宽；同时班级/专业成绩前60%、党员以及学生干部/校级荣誉/参军入伍中的至少一项都满足，所以可以按沈阳/大连市直来判断。",
        "大概率有资格报考第一批"
      );
    }

    if (data.top60 === "yes" && data.party && hasAnyExtra) {
      return buildResult(
        "city",
        "中",
        [...reasons, "新双一流这一档的市直更像是：班级/专业成绩前60% + 党员 + （学干/校奖/入伍满足其一）。"],
        risks,
        "因为你本科在新双一流这一档，同时满足班级/专业成绩前60%、党员，以及学生干部、校级荣誉、参军入伍中的至少一项，所以更像沈阳/大连市直。",
        "大概率有资格报考第一批"
      );
    }

    if (data.top60 === "yes" && data.highlightCount >= 2) {
      return buildResult(
        "district",
        "中高",
        [...reasons, "新双一流这一档的区直更像是：班级/专业成绩前60% + 四项里满足其二。"],
        risks,
        "因为你本科在新双一流这一档，班级/专业成绩前60%也还在；虽然还不够稳到市直，但党员、学生干部、校级荣誉、参军入伍里已经满足两项，所以更像沈大区直。",
        "大概率有资格报考第一批"
      );
    }
  }

  return buildResult(
    "street",
    "中高",
    [...reasons, "你当前没满足更高层级对应的硬门槛组合，所以结果更像街道及其他地市直。"],
    risks,
    "因为你虽然仍可能有第一批报名资格，但没有同时满足当前层级所要求的成绩、党员和补位项组合，所以更像街道及其他地市直。",
    "大概率有资格报考第一批"
  );
}

function evaluateForm() {
  const data = getBaseData();
  const qualificationResult = evaluateQualification(data);

  if (qualificationResult) {
    return qualificationResult;
  }

  if (data.applyLevel === "doctor") {
    return evaluateDoctor(data);
  }

  return evaluateNonDoctor(data);
}

function renderResult(result) {
  const meta = LEVEL_META[result.key];

  resultNodes.badge.textContent = meta.label;
  resultNodes.badge.className = `result-banner ${meta.badgeClass}`;
  resultNodes.entryStatus.textContent = result.entryStatus;
  resultNodes.summary.textContent = result.summary;
  resultNodes.confidence.textContent = `置信度：${result.confidence}`;
  resultNodes.fill.style.width = `${meta.meter}%`;
  resultNodes.primaryLevel.textContent = meta.label;
  resultNodes.levelRange.textContent = meta.range;
  resultNodes.reasonList.innerHTML = listMarkup(result.reasons);
  resultNodes.riskList.innerHTML = listMarkup(result.risks);
}

function setVisible(element, shouldShow) {
  if (!element) {
    return;
  }

  element.classList.toggle("hidden-section", !shouldShow);
  element.setAttribute("aria-hidden", shouldShow ? "false" : "true");
}

function syncVisibleSections() {
  const applyLevel = getValue("applyLevel");

  setVisible(visibleGroups.master, applyLevel === "master" || applyLevel === "doctor");
  setVisible(visibleGroups.doctor, applyLevel === "doctor");
}

demoButton.addEventListener("click", () => {
  form.querySelector(`[name="applyLevel"][value="doctor"]`).checked = true;
  syncVisibleSections();
  form.querySelector(`[name="doctorTier"][value="main"]`).checked = true;
  form.querySelector(`[name="masterTier"][value="main"]`).checked = true;
  form.querySelector(`[name="undergradTier"][value="newd1"]`).checked = true;
  form.querySelector(`[name="top60"][value="yes"]`).checked = true;
  form.querySelector(`[name="party"]`).checked = true;
  form.querySelector(`[name="cadre"]`).checked = true;
  form.querySelector(`[name="award"]`).checked = false;
  form.querySelector(`[name="military"]`).checked = true;
  form.querySelector(`[name="baselineChecked"]`).checked = true;
  form.querySelector(`[name="vetoUpgrade"]`).checked = false;
  form.querySelector(`[name="vetoIndependent"]`).checked = false;
  form.querySelector(`[name="vetoPrivate"]`).checked = false;
  form.querySelector(`[name="vetoSpring"]`).checked = false;
  renderResult(evaluateForm());
});

form.addEventListener("change", (event) => {
  if (event.target.name === "applyLevel") {
    syncVisibleSections();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderResult(evaluateForm());
});

generateButton.addEventListener("click", () => {
  renderResult(evaluateForm());
});

syncVisibleSections();

renderResult(
  buildResult(
    "verify",
    "待判断",
    [
      "先选报考层次；博士会依次展示博士、硕士、本科，硕士会展示硕士和本科，本科只展示本科。",
      "这版网页会先判断你是否大概率有资格报考第一批，再判断最可能层级。",
    ],
    ["最终仍以当年辽宁选调系统实际显示为准。"],
    "这是一套经验版自测器。你提交后会看到：第一批报考资格、最可能层级、为什么会落在这一层，以及哪些地方还可能让结果上下波动。",
    "先填写左侧信息"
  )
);
