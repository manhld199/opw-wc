function updateFutureOddsOnly() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trận đấu");
  var apiKey = "9a8500409b0dfc44a3333e84dc4c36c3";
  var sport = "soccer_fifa_world_cup";
  var regions = "eu";
  var markets = "spreads";
  
  var url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${apiKey}&regions=${regions}&markets=${markets}&oddsFormat=decimal`;
  
  try {
    var response = UrlFetchApp.fetch(encodeURI(url.trim()));
    var json = JSON.parse(response.getContentText());
    
    if (!json || json.length === 0) {
      SpreadsheetApp.getUi().alert("API không trả về trận đấu tương lai nào.");
      return;
    }
    
    var lastRowWithValues = 2; 
    while (sheet.getRange(lastRowWithValues + 1, 2).getValue().toString().trim() !== "") {
      lastRowWithValues++;
    }
    
    var idToRowMap = {};
    if (lastRowWithValues >= 3) {
      var idValues = sheet.getRange(3, 2, lastRowWithValues - 2, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        var id = idValues[i][0].toString().trim();
        if (id !== "") {
          idToRowMap[id] = i + 3;
        }
      }
    }
    
    var now = new Date();
    var insertCounter = 0;
    var updateCounter = 0;
    
    for (var i = 0; i < json.length; i++) {
      var match = json[i];
      var matchId = match.id;
      
      var vnTime = new Date(match.commence_time); 
      var formattedTime = Utilities.formatDate(vnTime, "GMT+7", "dd/MM/yyyy HH:mm");
      
      if (vnTime < now) {
        continue; 
      }
      
      var bmTitle = "", favoriteTeam = "", handicapPoint = "", priceFav = "", priceUnd = "";
      if (match.bookmakers && match.bookmakers.length > 0) {
        var bm = match.bookmakers.find(b => b.key.toLowerCase() === "pinnacle") || match.bookmakers[0];
        if (bm && bm.markets && bm.markets.length > 0) {
          bmTitle = bm.title;
          var market = bm.markets[0];
          if (market.key === "spreads" && market.outcomes.length === 2) {
            var out1 = market.outcomes[0];
            var out2 = market.outcomes[1];
            if (out1.point < 0) {
              favoriteTeam = out1.name; handicapPoint = Math.abs(out1.point); priceFav = out1.price; priceUnd = out2.price;
            } else {
              favoriteTeam = out2.name; handicapPoint = Math.abs(out2.point); priceFav = out2.price; priceUnd = out1.price;
            }
          }
        }
      }
      
      // CẤU TRÚC MẢNG GHI MỚI TỪ CỘT B ĐẾN CỘT P (Tổng cộng 15 cột)
      var rowData = [
        matchId,                  // Cột B
        match.sport_title,        // Cột C
        formattedTime,            // Cột D
        match.home_team,          // Cột E
        match.away_team,          // Cột F
        "",                       // Cột G (Trống - Bàn thắng chủ)
        "",                       // Cột H (Trống - Bàn thắng khách)
        "Chưa đá",                // Cột I (Trạng thái)
        "",                       // Cột J (Để trống để không đè vào công thức Hiệu số xét kèo)
        "",                       // Cột K (Để trống để không đè vào công thức Đội thắng)
        bmTitle,                  // Cột L (Tên nhà cái)
        favoriteTeam,             // Cột M (Đội cửa trên)
        handicapPoint,            // Cột N (Tỷ lệ chấp)
        priceFav,                 // Cột O (Tỷ lệ ăn cửa trên)
        priceUnd                  // Cột P (Tỷ lệ ăn cửa dưới)
      ];
      
      if (idToRowMap[matchId]) {
        // TRƯỜNG HỢP 1: TRẬN ĐÃ CÓ - CHỈ CẬP NHẬT KÈO
        var targetRow = idToRowMap[matchId];
        var currentStatusInSheet = sheet.getRange(targetRow, 9).getValue().toString().trim();
        
        if (currentStatusInSheet === "Chưa đá") {
          // 👉 SỬA TẠI ĐÂY: Ghi vào Cột 12 (Cột L) đến Cột P (5 cột)
          sheet.getRange(targetRow, 12, 1, 5).setValues([[bmTitle, favoriteTeam, handicapPoint, priceFav, priceUnd]]);
          updateCounter++;
        }
      } else {
        // TRƯỜNG HỢP 2: TRẬN MỚI HOÀN TOÀN
        var nextRow = 3;
        while (sheet.getRange(nextRow, 2).getValue().toString().trim() !== "") {
          nextRow++;
        }
        
        // Ghi toàn bộ mảng data dài 15 cột vào từ cột B
        sheet.getRange(nextRow, 2, 1, rowData.length).setValues([rowData]);
        
        // Thêm công thức tự động cho cột J và K cho dòng mới này nếu bạn muốn (Tùy chọn)
        // Ví dụ nếu cột J và K dùng hàm IF, bạn có thể bổ sung kéo công thức xuống ở đây.
        
        idToRowMap[matchId] = nextRow;
        insertCounter++;
      }
    }
    
    SpreadsheetApp.getUi().alert(`Cập nhật hoàn tất!\n- Thêm mới: ${insertCounter} trận.\n- Cập nhật tỷ lệ kèo: ${updateCounter} trận tương lai.`);
    
  } catch(error) {
    SpreadsheetApp.getUi().alert("Lỗi thực thi hệ thống: " + error.toString());
  }
}