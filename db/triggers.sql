DELIMITER $$

-- Trigger para inserção
CREATE TRIGGER trg_troca_insert
AFTER INSERT ON Troca
FOR EACH ROW
BEGIN
    INSERT INTO Historico (data_evento, acao, id_usuario, id_troca)
    VALUES (NOW(), 'INSERÇÃO DE TROCA (SOLICITANTE)', NEW.id_usuario_solicitante, NEW.id_troca);

    INSERT INTO Historico (data_evento, acao, id_usuario, id_troca)
    VALUES (NOW(), 'INSERÇÃO DE TROCA (OFERTANTE)', NEW.id_usuario_ofertante, NEW.id_troca);
END$$


-- Trigger para atualização
CREATE TRIGGER trg_troca_update
AFTER UPDATE ON Troca
FOR EACH ROW
BEGIN
    INSERT INTO Historico (data_evento, acao, id_usuario, id_troca)
    VALUES (NOW(), 'ATUALIZAÇÃO DE TROCA (SOLICITANTE)', NEW.id_usuario_solicitante, NEW.id_troca);

    INSERT INTO Historico (data_evento, acao, id_usuario, id_troca)
    VALUES (NOW(), 'ATUALIZAÇÃO DE TROCA (OFERTANTE)', NEW.id_usuario_ofertante, NEW.id_troca);
END$$

DELIMITER ;
