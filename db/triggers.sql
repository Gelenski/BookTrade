DELIMITER $$

CREATE TRIGGER trg_troca_insert
AFTER INSERT ON Troca
FOR EACH ROW
BEGIN
    INSERT INTO Historico (data_evento, acao, id_usuario, id_troca, detalhes)
    VALUES (
        NOW(),
        'INSERÇÃO DE TROCA (SOLICITANTE)',
        NEW.id_usuario_solicitante,
        NEW.id_troca,
        CONCAT(
            'status=', 
            CASE NEW.status
                WHEN 1 THEN 'pendente'
                WHEN 2 THEN 'em_negociacao'
                WHEN 3 THEN 'aceita'
                WHEN 4 THEN 'recusada'
                WHEN 5 THEN 'cancelada'
                WHEN 6 THEN 'concluida'
                ELSE 'desconhecido'
            END,
            '; livro_id=', IFNULL(NEW.id_livro_solicitado, 'NULL'),
            '; mensagem=', IFNULL(NEW.mensagem, ''),
            '; db_user=', CURRENT_USER()
        )
    );

    INSERT INTO Historico (data_evento, acao, id_usuario, id_troca, detalhes)
    VALUES (
        NOW(),
        'INSERÇÃO DE TROCA (OFERTANTE)',
        NEW.id_usuario_ofertante,
        NEW.id_troca,
        CONCAT(
            'status=', 
            CASE NEW.status
                WHEN 1 THEN 'pendente'
                WHEN 2 THEN 'em_negociacao'
                WHEN 3 THEN 'aceita'
                WHEN 4 THEN 'recusada'
                WHEN 5 THEN 'cancelada'
                WHEN 6 THEN 'concluida'
                ELSE 'desconhecido'
            END,
            '; livro_id=', IFNULL(NEW.id_livro_solicitado, 'NULL'),
            '; mensagem=', IFNULL(NEW.mensagem, ''),
            '; db_user=', CURRENT_USER()
        )
    );
END$$


CREATE TRIGGER trg_troca_update
AFTER UPDATE ON Troca
FOR EACH ROW
BEGIN
    -- Só registra mudança de status (evita histórico redundante quando campos não relacionados mudam)
    IF OLD.status <> NEW.status THEN

        INSERT INTO Historico (data_evento, acao, id_usuario, id_troca, detalhes)
        VALUES (
            NOW(),
            'ALTERAÇÃO DE STATUS (SOLICITANTE)',
            NEW.id_usuario_solicitante,
            NEW.id_troca,
            CONCAT(
                'status: ',
                CASE OLD.status
                    WHEN 1 THEN 'pendente'
                    WHEN 2 THEN 'em_negociacao'
                    WHEN 3 THEN 'aceita'
                    WHEN 4 THEN 'recusada'
                    WHEN 5 THEN 'cancelada'
                    WHEN 6 THEN 'concluida'
                    ELSE 'desconhecido'
                END,
                ' -> ',
                CASE NEW.status
                    WHEN 1 THEN 'pendente'
                    WHEN 2 THEN 'em_negociacao'
                    WHEN 3 THEN 'aceita'
                    WHEN 4 THEN 'recusada'
                    WHEN 5 THEN 'cancelada'
                    WHEN 6 THEN 'concluida'
                    ELSE 'desconhecido'
                END,
                '; livro_id=', IFNULL(NEW.id_livro_solicitado, 'NULL'),
                '; mensagem=', IFNULL(NEW.mensagem, ''),
                '; alterado_por=', CURRENT_USER()
            )
        );

        INSERT INTO Historico (data_evento, acao, id_usuario, id_troca, detalhes)
        VALUES (
            NOW(),
            'ALTERAÇÃO DE STATUS (OFERTANTE)',
            NEW.id_usuario_ofertante,
            NEW.id_troca,
            CONCAT(
                'status: ',
                CASE OLD.status
                    WHEN 1 THEN 'pendente'
                    WHEN 2 THEN 'em_negociacao'
                    WHEN 3 THEN 'aceita'
                    WHEN 4 THEN 'recusada'
                    WHEN 5 THEN 'cancelada'
                    WHEN 6 THEN 'concluida'
                    ELSE 'desconhecido'
                END,
                ' -> ',
                CASE NEW.status
                    WHEN 1 THEN 'pendente'
                    WHEN 2 THEN 'em_negociacao'
                    WHEN 3 THEN 'aceita'
                    WHEN 4 THEN 'recusada'
                    WHEN 5 THEN 'cancelada'
                    WHEN 6 THEN 'concluida'
                    ELSE 'desconhecido'
                END,
                '; livro_id=', IFNULL(NEW.id_livro_solicitado, 'NULL'),
                '; mensagem=', IFNULL(NEW.mensagem, ''),
                '; alterado_por=', CURRENT_USER()
            )
        );

    END IF;
END$$

DELIMITER ;
