/*
 * Copyright (C) 2018 Freie Universität Berlin
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Martine Lenders <m.lenders@fu-berlin.de>
 */

function id_attr(id) {
  if (id) {
    return ' id="' + id + '"';
  }
  else {
    return "";
  }
}

function extraclasses_append(extraclasses) {
  if (extraclasses && (extraclasses.length > 0)) {
    return " " + extraclasses.join(" ");
  }
  return "";
}

function bs_row(content, id, extraclasses) {
  return '<div' + id_attr(id) + ' class="row' +
    extraclasses_append(extraclasses) + '">' + content + '</div>';
}

function bs_col(content, width, extraclasses) {
  return '<div class="col-md-' + width +
    extraclasses_append(extraclasses) + '">' + content + "</div>";
}

function bs_panel(title, body, id, extraclasses) {
  return '<div' + id_attr(id) + ' class="panel' +
    extraclasses_append(extraclasses) + '">' +
                 '<div class="panel-heading">' +
                   '<h3 class="panel-title">' + title + '</h3>' +
                 '</div>' +
                 '<div class="panel-body">' + body + '</div>' +
               "</div>"
}

function glyphicon(icon_name) {
  if (icon_name) {
    return "<span class=\"glyphicon glyphicon-" + icon_name +
           "\"aria-hidden=\"true\"></span>";
  }
  else {
    return "";
  }
}

function progress_bar(percent) {
  return '<div class="progress">' +
           '<div class="progress-bar progress-bar-striped" ' +
                'role="progressbar" ' +
                'aria-valuenow="' + percent + '" ' +
                'aria-valuemin="0" aria-valuemax="100" ' +
                'style="width:' + percent + '%">' + percent + '%' +
           '</div>' +
         '</div>';
}

function pr_status(prnum, status) {
  /* the status parameter is expected to be an object with the following
   * attributes:
   *  - total (optional): total number of jobs to execute for the PR
   *  - passed (optional): total number of jobs already done and passed
   *    for the PR
   *  - failed (optional): total number of jobs already done and failed
   *    for the PR
   *  - eta (required, when total, passed, and failed are provided,
   *    otherwise optional): current ETA for the processing of the PR
   *  - status (optional): a status text for the PR
   *  - failed_jobs (optional): list of jobs (may be of length 0) that are
   *    already done and failed. An object in this list is expected to have
   *    the following attributes:
   *      - name (required): the name of the job
   *      - href (optional): a link to the logfile of the job
   */
  var divider = "";
  var stat_html = "";
  var failed_jobs_html = "";
  var percent = 0;
  var text = null;
  var eta = "";

  if (status.hasOwnProperty('total') &&
      status.hasOwnProperty('passed') &&
      status.hasOwnProperty('failed') &&
      (status.total >= (status.passed + status.failed))) {
    var done = status.passed + status.failed;
    percent = Math.round((done * 100) / status.total);
    text = glyphicon("stats") +
      ' fail: ' + status.failed +
      ' pass: ' + status.passed +
      ' done: ' + done + '/' + status.total;
    eta = glyphicon("time") + ' ' +
          moment.duration(status.eta, "seconds").humanize(true);
  }
  else if (status.status) {
    text = glyphicon("transfer") + ' ' + status.status;
  }

  if (text) {
    stat_html += bs_row(bs_col(progress_bar(percent), 6) +
                        bs_col(text, 4) +
                        bs_col(eta, 2));
  }
  if (status.failed_jobs) {
    if (status.failed_jobs.length > 0) {
      failed_jobs_html += "<h5><strong>Failed jobs:</strong></h5>";
    }
    var gridsize = 4;
    var row_content = "";
    for (var i = 0; i < status.failed_jobs.length; i++) {
      var failed_job = status.failed_jobs[i];
      if ((i > 0) && ((i % gridsize) == 0)) {
        failed_jobs_html += bs_row(row_content);
        row_content = "";
      }
      if (failed_job.href) {
        var id = "job-" + prnum + "-" + job_id(failed_job.name);
        failed_job.name = '<a class="job-link" ' +
                             'id="' + id + '" ' +
                             'href="' + failed_job.href + '">' +
                             failed_job.name + ' </a>';
      }
      row_content += bs_col(failed_job.name, Math.floor(12 / gridsize));
    }
    failed_jobs_html += bs_row(row_content);
  }
  return bs_col(divider + stat_html + failed_jobs_html, 12);
}

function add_item(obj, type, pr) {
    var pattern = new RegExp("[0-9]+$")
    var prnum = pattern.exec(pr.url);
    var d = new Date(pr.since * 1000);
    var cl;
    var icon;
    var title;
    var duration = "";
    var runtime_icon = "";
    var status_html = "";


    switch (type) {
        case 0:
            icon = "inbox"
            cl = "info";
            break;
        case 1:
            icon = "wrench"
            cl = "warning";
            break;
        case 2:
            if (pr.result == "passed") {
                icon = "ok"
                cl = "success";
            }
            else if (pr.result == "errored") {
                icon = "remove"
                cl = "danger";
            }
            runtime_icon = "hourglass";
            if (pr.runtime) {
              duration = moment.duration(pr.runtime * -1000).humanize();
            }
            if (pr.status_html) {
              status_html = pr.status_html;
            }
            else if (pr.status) {
              status_html = pr_status(prnum, pr.status);
            }
            break;
        default:
            icon = "question-sign"
            cl = "default";
            break;
    }
    if (type == 2) {
        title = "<a href=\"" + pr.output_url + "\">" + pr.title + "</a>";
    }
    else {
        title = pr.title;
    }
    var item_content = "";
    if (pr.url) {
      item_content += bs_col(glyphicon("user") + " " + pr.user, 2) +
                      bs_col(glyphicon("link") +
                        ' <a href="' + pr.url + '" target="_blank">' +
                        'PR #' + prnum + '</a>', 2);
    }
    item_content += bs_col(glyphicon("tag") +
                      ' <a href="https://github.com/RIOT-OS/RIOT/commit/' +
                      pr.commit + '" target="_blank">' +
                      "<code>" + pr.commit.substring(0,7) +
                      "</code></a>", 2) +
                    bs_col(glyphicon("calendar") + " " +
                      d.toLocaleString() + ' <div ' +
                      'class="since" style="display: inline"' +
                      'since="' + (pr.since * 1000) + '"></div>', 4);
    if (duration.length > 0) {
      bs_col(glyphicon(runtime_icon) + " " + duration, 2);
    }
    var panel_id;
    if (prnum) {
      panel_id = "pr-" + prnum;
    }
    else {
      panel_id = "n-" + pr.since + "-" + pr.commit;
    }
    var status_id = panel_id + "-status";
    obj.append(bs_panel(glyphicon(icon) + " " + title,
               bs_row(item_content) +
               bs_row(status_html, status_id),
               panel_id, ["panel-" + cl]));
    $(".job-link").unbind().click(job_link)
}

function scroll_to_details(hash) {
  var pattern = new RegExp("^#job-[0-9]+-.*-details$")
  var match = pattern.exec(hash);
  if (match) {
    var target_id = hash.slice(0, -("-details".length));
    var target = $(target_id);
    $(window).on("hashchange", function() {
      // Do nothing
    });
    job_load_details_from_obj(target);
  }
}

function get_prs() {
  $.ajax({
      url: "https://" + murdockConfig.baseURL + "/api/pull_requests",
      context: $('#pull_requests'),
  }).done(function(prs) {
      $(this).empty()
      if (prs.queued) {
          prs.queued.sort(function(a,b){ return b.since - a.since });
          for (i = 0; i < prs.queued.length; i++) {
              add_item($(this), 0, prs.queued[i]);
          }
      }
      if (prs.building) {
          prs.building.sort(function(a,b){ return b.since - a.since });
          for (i = 0; i < prs.building.length; i++) {
              add_item($(this), 1, prs.building[i]);
          }
      }
      if (prs.finished) {
          prs.finished.sort(function(a,b){ return b.since - a.since });
          for (i = 0; i < prs.finished.length; i++) {
              add_item($(this), 2, prs.finished[i]);
          }
      }
      update_durations();
      scroll_to_details(location.hash);
  });
}

function build_branches_menu(active_branch) {
  var branches = [{name: "master"}]; /* TODO get from server */
  var branches_menu = $("#branches-menu");

  if (!active_branch) {
    var active_branch = location.hash.substr(1);

    if (branches.filter(branch => branch.name == active_branch).length == 0) {
      active_branch = murdockConfig.default_branch;
    }
  }
  branches_menu.empty();
  branches.forEach(function(branch) {
    var branch_entry = $('<li></li>');
    var branch_link = branch_entry.html('<a href="#' + branch.name + '">' +
                                        branch.name + '</a>');
    if (branch.name == active_branch) {
      branch_entry.addClass("active");
    }
    else {
      branch_link.click(function (ev) {
        build_branches_menu(branch.name);
        get_nightlies(ev, branch.name);
      })
    }
    branches_menu.append(branch_entry);
  });
}

function get_nightlies(ev, branch) {
  var nightlies = $('#nightlies');
  if (!branch) {
    branch = murdockConfig.default_branch;
  }
  nightlies.empty()
  $.ajax({
    url: "https://" + murdockConfig.baseURL + "/" + murdockConfig.repo_path +
         "/" + branch + "/nightlies.json",
    context: nightlies,
  }).done(function(nightlies) {
    for (i = 0; i < nightlies.length; i++) {
      nightlies[i].title = new Date(nightlies[i].since * 1000).toLocaleDateString(
          navigator.language,
          {weekday: "short", year: "numeric", month: "short", day: "numeric"}
        ) + " (" + nightlies[i].commit.substring(0, 7) + ")";
      nightlies[i].output_url = "https://" + murdockConfig.baseURL + "/" +
            murdockConfig.repo_path + "/" + branch + "/" + nightlies[i].commit +
            "/output.html";
      add_item($(this), 2, nightlies[i]);
    }
    update_durations();
  });
}

function update_status(event) {
  var msg = JSON.parse(event.data);
  if (msg.cmd == "reload_prs") {
    get_prs();
  }
  else if (msg.cmd == "prstatus") {
    var prnum = msg.prnum;
    var html;
    if (msg.html) {
      html = msg.html;
    }
    else if (msg.status) {
      html = pr_status(msg.prnum, msg.status);
    }
    $('#pr-' + prnum + '-status').html(html);
    $(".job-link").click(job_link)
  }
}

function connect_status(f) {
  // setup websocket with callbacks
  var ws = new WebSocket('wss://' + murdockConfig.baseURL + '/status');
  ws.onopen = f;
  ws.onclose = function() {
    setTimeout(connect_status, 1000);
  };
  ws.onmessage = update_status;
}

function update_durations() {
    var elems = document.querySelectorAll('div.since');
    for(var i=0;i<elems.length;i++) {
        var elem = elems[i];
        d = new Date(parseInt(elem.getAttribute("since")));
        elem.innerHTML = "(" + moment(d).fromNow() + ")";
    }
}

function job_id(job_name) {
  return job_name.replace(/[/:]/g, "-");
}

function job_load_details(obj, prnum, job_id, job_link) {
  obj.parent().parent().after(
    bs_row("", id=job_id + "-details",
      extraclasses=["job-" + prnum + "-details"])
  );
  obj.addClass("detailed-job")
  var details = $("#" + job_id + "-details");
  $.ajax(job_link).done(function(data) {
    var ansi_up = new AnsiUp;
    details.html(
      bs_col(
        '<pre id="' + job_id + '-pre" style="display: none; max-height: 85em;">' +
        '<a href="' + job_link + '">' + job_link + '</a>\n\n' +
        ansi_up.ansi_to_html(data) + '</pre>',
        12
      )
    );
    var pre = $("#" + job_id + "-pre");
    pre.slideDown({ duration: 400, queue: false }, "swing");
    $([document.documentElement, document.body]).animate({
      scrollTop: $("#" + job_id).offset().top - 70
    }, 400, function () {
      $(".dejagged").remove();
    });
    window.location.hash = "#" + job_id + "-details";
  })
}

function job_load_details_from_obj(obj) {
  var job_link_obj = obj;
  var job_id = job_link_obj.attr("id");
  var job_link = job_link_obj.attr("href")
  var prnum = job_id.split("-")[1];
  var only_remove = ($("#" + job_id + "-details").length > 0);
  var open_job_details = $(".job-" + prnum + "-details");
  var any_open = (open_job_details.length > 0)
  // prevents jumping to the top when window is too small
  $("html").append('<div class="dejagged" style="margin-top: 1000px;">');
  $(".job-" + prnum + "-details,.detailed-job").removeClass("detailed-job")
  open_job_details.slideUp(400, function() {
    $(this).remove();
    if (!only_remove) {
      job_load_details(job_link_obj, prnum, job_id, job_link);
    }
    else {
      window.location.hash = "#";
      $(".dejagged").remove();
    }
  });
  if (!any_open) {
    job_load_details(job_link_obj, prnum, job_id, job_link);
  }
}

function job_link(event) {
  event.preventDefault();
  job_load_details_from_obj($(this));
}
