// Draw line between obj1 and obj2.
// line: color of the line "#fff"
// bg: color and width of the background line, "#fff | 5"
Raphael.fn.connection = function (obj1, obj2, line, bg) {
    if (obj1.line && obj1.from && obj1.to) {
        line = obj1;
        obj1 = line.from;
        obj2 = line.to;
    }
    var bb1 = obj1.getBBox(),
        bb2 = obj2.getBBox(),
        p = [{x: bb1.x + bb1.width / 2, y: bb1.y - 1},
        {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + 1},
        {x: bb1.x - 1, y: bb1.y + bb1.height / 2},
        {x: bb1.x + bb1.width + 1, y: bb1.y + bb1.height / 2},
        {x: bb2.x + bb2.width / 2, y: bb2.y - 1},
        {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + 1},
        {x: bb2.x - 1, y: bb2.y + bb2.height / 2},
        {x: bb2.x + bb2.width + 1, y: bb2.y + bb2.height / 2}],
        d = {}, dis = [];
    for (var i = 0; i < 4; i++) {
        for (var j = 4; j < 8; j++) {
            var dx = Math.abs(p[i].x - p[j].x),
                dy = Math.abs(p[i].y - p[j].y);
            if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
                dis.push(dx + dy);
                d[dis[dis.length - 1]] = [i, j];
            }
        }
    }
    if (dis.length == 0) {
        var res = [0, 4];
    } else {
        res = d[Math.min.apply(Math, dis)];
    }
    var x1 = p[res[0]].x,
        y1 = p[res[0]].y,
        x4 = p[res[1]].x,
        y4 = p[res[1]].y;
    dx = Math.max(Math.abs(x1 - x4) / 2, 10);
    dy = Math.max(Math.abs(y1 - y4) / 2, 10);
    var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
        y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
        x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
        y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
    var path = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
    if (line && line.line) {
        line.bg && line.bg.attr({path: path});
        line.line.attr({path: path});
    } else {
        var color = typeof line == "string" ? line : "#000";
        return {
            bg: bg && bg.split && this.path(path).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}),
            line: this.path(path).attr({stroke: color, fill: "none"}),
            from: obj1,
            to: obj2
        };
    }
};

var el;
var draw_raphael = function (paper, objects) {
        if(objects == null || paper == null)
        {
            return;           
        }
        $.each(objects, function(index, element){
            // 随机获取每一个头像的位置
            var cx = 0, cy = 0;
            do{
                cx = Math.random()*$("#map-svg-holder").width()+1;
                cx = cx>$("#map-svg-holder").width()-48?cx-48:cx;
                cy = Math.random()*$("#map-svg-holder").height()+1;
                cy = cy>$("#map-svg-holder").height()-48?cy-48:cy;
                console.log("Rect id:"+index+" x:"+cx+" y:"+cy);
            }while(
            /* 打开会导致浏览量CPU爆棚
                function(){
                    for(var id in objects){
                        if(objects[id].rect){
                            console.log("id:"+id+" already has rect");
                            var dx = objects[id].x, dy = objects[id].y;
                            if(cx>=dx-48 && cx<=dx+48 && cy>=dy-48 && cy<=dy+48)
                            {
                                return true;
                            }
                        }
                        else{
                            console.log("id:"+id+" has no rect");
                        }
                    }
                    return false;
                }()
            */
                0
            );
            // 创建头像的矩形
            var rect = paper.rect(cx, cy, 48, 48);
            rect.attr({fill: "fff", stroke: "#fff", "fill-opacity": 0, "stroke-width": 1});
            element.x = cx;
            element.y = cy;
            element.rect = rect;
            // 创建头像的图片
            //var img = paper.image($("#user-"+index).attr("src"), element.x, element.y, 48, 48);
            var img = paper.image(document.getElementById("user-"+index).src, element.x, element.y, 48, 48);
        });
        // 至此，所有的头像都已生成完毕
        // 为头像创建链接
        $.each(objects, function(source_id, source_user_context){
            if(source_user_context.rect){
                $.each(source_user_context.following, function(target_id, target_user_info){
                    if(objects[target_id] && objects[target_id].rect){
                        var target_user_context = objects[target_id];
                        if(target_user_context.following[source_id]){
                            // 若双向关注，则标记为蓝色线
                            paper.connection(source_user_context.rect, target_user_context.rect, "#0ff");
                        }
                        else{
                            // 若单项关注，则标记为红色线
                            paper.connection(source_user_context.rect, target_user_context.rect, "#f00");
                        }
                    }
                });
            }
        });
        /*
        $.each(objects, function(source_object_index, source_object_element){
            if(source_object_element.rect)
            {
                $.each(source_object_element.link_to, function(link_to_index, link_to_id){
                    $.each(objects, function(target_object_index, target_object_element){
                        if(target_object_element.id == link_to_id && target_object_element.rect)
                        {
                            var con = paper.connection(source_object_element.rect, target_object_element.rect, "#000");
                            console.log("link from "+source_object_element.id+" to "+target_object_element.id);
                            var path = {};
                            path.source = source_object_element.id;
                            path.target = target_object_element.id;
                            path.connection = con;
                            source_object_element.path.push(path);
                        }
                    });
                });
            }
        });
        */
};
/*
$(function(){
    var paper = new Raphael("raphael-paper", $("#raphael-paper").width(), $("#raphael-paper").height());
    var objects_to_draw = [
        {id:"4", img_src:"./f9.jpg", x:0, y:0, link_to:["5", "6"], path:[]},
        {id:"5", img_src:"./f9.jpg", x:0, y:0, link_to:["6", "7"], path:[]},
        {id:"6", img_src:"./f9.jpg", x:0, y:0, link_to:["4", "5"], path:[]},
        {id:"7", img_src:"./f9.jpg", x:0, y:0, link_to:["4", "5"], path:[]}
    ];
    draw_raphael(paper, objects_to_draw);
});
*/
